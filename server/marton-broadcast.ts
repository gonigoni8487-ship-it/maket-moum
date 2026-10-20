// 마트ON 행사 매장 방송: 행사상품 → 쇼호스트 원고(AI 작성) → 음성(Gemini TTS, 1인·2인 대화) + 배경음악(Lyria). 합치기는 기기에서 한다.
import type { GoogleGenAI } from '@google/genai';
import {
  BRAND, BROADCAST_THEMES, THEME_STYLE, SPEAKER_NAMES, MIN_SECONDS, MAX_SECONDS, scriptBudget, scriptGaps, koreanNumber, hasBrand, hasPlaceMention, PLACE_WORDS, isHost, hostLabel, isPace, paceOf, type Pace, hostVoice, isVoiceStyle, type VoiceStyle,
  type BroadcastScript, type BroadcastSegment, type BroadcastTheme, type BroadcastMusic, type BroadcastSpeech, type Host,
} from '../src/marton/broadcast';
import { matchProduct, storeDayStart, storeTime, type FlyerItem } from '../src/marton/shared';
import { platform } from './platform';
import { auth, db, text, parseJson, type RouteApp } from './marton';
import { normalizeStore } from '../src/marton/kpi';

const AI_MODEL = 'gemini-3.5-flash';
// 음성·음악 모델은 미리보기 단계라 이름이 바뀌기 쉽다. 환경변수로 바꿀 수 있고, 없는 모델이면 다음 후보로 넘어간다.
const TTS_MODELS = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'];
const MUSIC_MODELS = ['lyria-3.5', 'lyria-3-pro-preview'];
const MAX_LINE_CHARS = 300;
const MAX_SEGMENT_CHARS = 700;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** 음악 생성은 곡당 요금이 붙으므로 매장 하루 생성 수를 제한한다 */
const MUSIC_DAILY_LIMIT = () => Number(platform().env('MARTON_MUSIC_DAILY_LIMIT')) || 30;

const isTheme = (v: unknown): v is BroadcastTheme => BROADCAST_THEMES.includes(v as BroadcastTheme);
const won = (n?: number) => (n ? `${n.toLocaleString()}원` : '');
const DEFAULT_HOST: Host = { gender: '여성', age: '30대' };
const cleanHosts = (v: unknown): Host[] => {
  const list = (Array.isArray(v) ? v : []).filter(isHost).slice(0, 2).map(h => ({ gender: h.gender, age: h.age }));
  return list.length ? list : [DEFAULT_HOST];
};

const candidates = (envName: string, defaults: string[]) => [...new Set([platform().env(envName), ...defaults].filter((m): m is string => Boolean(m)))];
/** 모델이 없거나(404) 이 키로 못 쓰는 경우만 다음 후보로 */
const modelMissing = (e: unknown) => /not found|404|not supported|unsupported|does not exist|permission/i.test(String((e as Error)?.message ?? e));

async function withModels<T>(models: string[], run: (model: string) => Promise<T>): Promise<T> {
  let last: unknown;
  for (const model of models) {
    try { return await run(model); } catch (e) {
      last = e;
      if (!modelMissing(e)) break;
      console.warn(`MartON broadcast: ${model} 사용 불가, 다음 모델 시도`);
    }
  }
  throw last;
}

/** 응답에서 오디오 조각 찾기 */
function audioPart(response: any): { data: string; mimeType: string } | undefined {
  for (const c of response?.candidates ?? []) {
    for (const p of c?.content?.parts ?? []) {
      if (p?.inlineData?.data && String(p.inlineData.mimeType ?? '').startsWith('audio/')) return { data: p.inlineData.data, mimeType: p.inlineData.mimeType };
    }
  }
  return undefined;
}

/** 원고에 넣을 사실: 전단 내용 + 아낀 금액(계산) + 분류(수산·축산 등, 상품 DB에 있으면). 모든 점포 공용 방송이라 매장 위치는 넣지 않는다. AI가 지어내지 않도록 근거를 다 준다 */
function itemFacts(it: FlyerItem) {
  const save = it.originalPrice && it.price && it.originalPrice > it.price ? it.originalPrice - it.price : 0;
  const dept = matchProduct(it, db.products)?.dept;
  return [
    dept && `[${dept}]`, it.name, it.spec && `(${it.spec})`,
    it.price && `행사가 ${won(it.price)}`, it.originalPrice && `정상가 ${won(it.originalPrice)}`,
    save && `${won(save)} 저렴 (${Math.round(save / it.originalPrice! * 100)}%)`,
    it.condition && `혜택 ${it.condition}`, it.period && `기간 ${it.period}`,
  ].filter(Boolean).join(' / ');
}

function cleanItems(input: unknown): FlyerItem[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 40).flatMap((it: any) => {
    const name = text(it?.name, 60);
    if (!name) return [];
    const n = (v: unknown) => (typeof v === 'number' && v > 0 && v < 1e8 ? Math.round(v) : undefined);
    return [{ name, code: text(it?.code, 20) || undefined, spec: text(it?.spec, 40) || undefined, price: n(it?.price), originalPrice: n(it?.originalPrice), condition: text(it?.condition, 200) || undefined, period: text(it?.period, 40) || undefined }];
  });
}

/** AI 응답·직원 수정본을 같은 모양으로 */
function cleanSegments(input: unknown, hostCount: number): BroadcastSegment[] {
  return (Array.isArray(input) ? input : []).slice(0, 12).flatMap((s: any) => {
    const raw = Array.isArray(s?.lines) ? s.lines : typeof s?.text === 'string' ? [{ who: 0, text: s.text }] : [];
    let total = 0;
    const lines = raw.slice(0, 16).flatMap((l: any) => {
      const t = text(l?.text, MAX_LINE_CHARS);
      if (!t || (total += t.length) > MAX_SEGMENT_CHARS) return [];
      return [{ who: hostCount > 1 && Number(l?.who) === 1 ? 1 as const : 0 as const, text: t }];
    });
    return lines.length ? [{ lines }] : [];
  });
}

/** 성우 연기 지시 (Gemini TTS 프롬프트 가이드의 장면·연출 메모 형식) */
function speechPrompt(hosts: Host[], style: VoiceStyle, tone: string, pace: Pace, transcript: string) {
  const people = hosts.map((h, i) => `${hosts.length > 1 ? `${SPEAKER_NAMES[i]}: ` : ''}${hostVoice(h, style).persona}`);
  return [
    '# AUDIO PROFILE',
    ...people,
    '## THE SCENE',
    `${BRAND} 매장 스피커로 나가는 홈쇼핑 생방송 스타일의 행사 안내. 마감 직전 주문 전화가 몰리는 순간처럼 들뜨고 생동감 있게, 장 보는 손님들이 "지금 사야겠다" 싶어 걸음을 멈추는 방송.`,
    '### DIRECTOR\'S NOTES',
    `말투: ${tone}.`,
    paceOf(pace).direction && `빠르기: ${paceOf(pace).direction}`,
    style === 'lively' && '에너지: 처음부터 끝까지 높은 텐션 유지. 감탄은 크게, 가격은 신나게 외치듯, 문장 끝은 올려서 밝게. 그래도 소리 지르거나 발음이 뭉개지지 않게.',
    '원고를 읽는 느낌이 절대 나면 안 됨. 실제 쇼호스트가 카메라 앞에서 즉석으로 말하듯 자연스럽게, 숨 쉬는 타이밍과 미소가 들리게.',
    '문장마다 억양과 빠르기에 변화를 주고, 가격·할인·"롯데마트"에서는 살짝 힘을 주고 반 박자 쉬었다 가기. 기계처럼 일정한 속도와 높낮이 금지.',
    hosts.length > 1 ? '두 사람은 오래 호흡을 맞춘 진행자 콤비. 상대 말에 진짜로 반응하듯 맞장구와 리액션을 살려서, 말이 끝나자마자 자연스럽게 받기.' : '',
    '#### TRANSCRIPT',
    transcript,
  ].filter(Boolean).join('\n');
}

// ---- 배경음악: 매장 기본 스타일(현장에서 정한 설명) + 만들 때마다 조성·빠르기·악기를 무작위로 바꿔 매번 다른 곡 ----
const MUSIC_HOUSE_STYLE = 'Bright, upbeat instrumental background track for a Korean supermarket in-store promotional announcement. Cheerful commercial jingle, lively major-key melody, light pop drums, claps, bouncy bass, sparkling keyboard and acoustic guitar. Energetic, friendly, welcoming and family-oriented. Simple catchy melody, clean professional retail advertising sound.';
const MUSIC_RULES = 'No vocals, no lyrics, no spoken words, no dramatic transitions, no harsh sounds. Keep the midrange clear so a Korean shopping-host voice can be heard easily. Steady volume throughout and a smooth fade-out ending.';
const MUSIC_VARIATIONS = {
  key: ['C major', 'D major', 'E-flat major', 'F major', 'G major', 'A major', 'B-flat major'],
  bpm: [112, 116, 118, 120, 122, 124, 126, 128],
  colour: [
    'glockenspiel and ukulele lead with handclaps',
    'marimba and whistled hook with finger snaps',
    'bright piano stabs and short brass hits',
    'plucky synth and funky muted guitar',
    'toy piano and pizzicato strings',
    'electric piano chords and tambourine',
    'xylophone riff and acoustic strums',
    'steel drum accents and shakers',
  ],
  groove: ['bouncy pop', 'light funk', 'feel-good disco-pop', 'sunny ska-pop', 'happy shuffle', 'upbeat city-pop'],
};
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/** 음악 생성 지시: 기본 스타일 + 행사 분위기 + 무작위 변주 */
export function musicPrompt(themeStyle: string, seconds: number) {
  const v = `Variation for this take: ${pick(MUSIC_VARIATIONS.groove)} groove in ${pick(MUSIC_VARIATIONS.key)} at about ${pick(MUSIC_VARIATIONS.bpm)} bpm, featuring ${pick(MUSIC_VARIATIONS.colour)}.`;
  return `${MUSIC_HOUSE_STYLE} Event mood: ${themeStyle}. ${v} ${MUSIC_RULES} Approximately ${seconds} seconds long.`;
}

export function registerBroadcast(app: RouteApp, genAI: GoogleGenAI, aiEnabled: boolean) {
  const api = '/api/marton';
  const noKey = { error: 'AI 키(GEMINI_API_KEY)가 설정되지 않아 매장 방송을 만들 수 없습니다.' };
  const musicUsed = { day: 0, count: 0 };

  // 1) 행사상품으로 쇼호스트 원고 쓰기
  app.post(`${api}/ai/broadcast/script`, auth, async (req, res) => {
    if (!aiEnabled) return res.status(503).json(noKey);
    const items = cleanItems(req.body.items);
    if (!items.length) return res.status(400).json({ error: '방송할 행사상품을 한 개 이상 골라 주세요.' });
    const seconds = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(Number(req.body.seconds) || 120)));
    const wantTheme = isTheme(req.body.theme) ? req.body.theme : '자동';
    const hosts = cleanHosts(req.body.hosts);
    const duo = hosts.length > 1;
    const note = text(req.body.note, 500);
    const pace: Pace = isPace(req.body.pace) ? req.body.pace : 'normal';
    const voiceStyle: VoiceStyle = isVoiceStyle(req.body.voiceStyle) ? req.body.voiceStyle : 'natural';
    const { segments, chars } = scriptBudget(seconds, pace);
    const themes = Object.keys(THEME_STYLE);
    const now = storeTime(Date.now());

    const prompt = [
      `당신은 ${BRAND} 매장 방송 대본을 쓰는 10년 차 홈쇼핑 쇼호스트 작가입니다. 아래 행사상품으로 매장 스피커에서 나갈 방송 대본을 쓰세요.`,
      note ? `\n[담당자 추가 요청사항 — 가장 먼저, 빠짐없이 반영]\n${note}\n- 위 요청은 아래 말투·구성 규칙보다 우선합니다. 어떤 상품을 먼저·더 많이 말할지, 강조할 혜택·문구, 넣거나 뺄 내용, 말투 지시를 그대로 따르세요.\n- 요청이 특정 분류·상품만 말하라고 하면(예: "수산물만", "과일·채소만", "1+1 상품만") 아래 행사상품 중 해당하는 것만 골라 쓰고, 나머지 상품은 원고에서 아예 빼세요. 분류 표시([수산] 등)가 없는 상품은 상품명으로 판단하세요(연어·고등어·전복·새우·오징어·꽃게·김·초밥 → 수산물).\n- 단, 가격·혜택을 지어내지 않기, 점포명·매대 위치 넣지 않기, "${BRAND}" 단락마다 한 번 규칙은 요청이 있어도 지키세요.\n` : '',
      duo
        ? `진행자 2명이 주고받는 대화입니다. 진행자1(who 0)은 ${hostLabel(hosts[0])}, 진행자2(who 1)는 ${hostLabel(hosts[1])} 쇼호스트. 한 사람이 질문하거나 감탄하면 다른 사람이 받아서 혜택을 풀어 주는 식으로, 대사는 한 번에 1~2문장씩 번갈아. 서로 이름은 부르지 마세요.`
        : `진행자 1명(${hostLabel(hosts[0])} 쇼호스트)이 손님에게 직접 말을 거는 방송입니다. lines의 who는 모두 0.`,
      '',
      '[필수 — 분량보다 우선]',
      note ? '- 담당자 요청에 맞는 상품은 하나도 빠짐없이 모두 소개하세요.' : '- 아래 행사상품을 하나도 빠짐없이 모두 소개하세요.',
      '- 소개하는 상품마다 가격(규격과 함께)을 반드시 한 번 이상 말하세요. 가격이 없는 상품만 혜택으로 소개.',
      '- 상품마다 붙은 혜택(행사카드·카드사 할인, 대한민국 수산대전·정부 할인, 엘포인트, N+1, 덤)을 전부 말하세요. 혜택이 여러 개면 "행사카드로 오십 퍼센트, 거기에 수산대전 이십 퍼센트까지!"처럼 겹쳐서 받는다는 게 들리게.',
      '- 상품이 많아 분량이 모자라면 상품당 한두 문장으로 짧게 줄이세요. 상품이나 가격을 빼서 분량을 맞추면 안 됩니다.',
      '',
      '[분량]',
      `- 공백 뺀 글자 수로 약 ${chars}자 (±10%, 단 위 [필수]를 지키느라 길어지는 건 괜찮음). 방송 ${Math.round(seconds / 6) / 10}분 기준.`,
      `- ${segments}개 단락. 단락 사이에는 배경음악만 잠깐 나옵니다. 상품이 적으면 핵심 상품을 다른 각도로 한 번 더 짚는 단락을 넣으세요.`,
      '',
      `[${BRAND} — 반드시 지킬 것]`,
      `- 모든 단락에 "${BRAND}"를 딱 한 번씩, 문장 속에 자연스럽게 (예: "${BRAND}에서만 이 가격", "${BRAND}에서 지금 바로 담아 가세요", "${BRAND} 엘포인트 회원님이라면"). 한 단락에 두 번 이상은 금지.`,
      `- 전국 ${BRAND} 어느 점포에서나 트는 공용 방송입니다. ○○점 같은 점포 이름, 층·코너·매대·진열 위치("수산 코너로", "입구 쪽", "몇 번 매대")는 절대 말하지 마세요.`,
      '',
      '[후킹·설득·맥락 — 자동으로 넣을 것]',
      '- 첫 마디는 귀를 잡는 후킹: 손님 상황을 짚는 질문이나 놀라운 숫자로 시작 (예: "오늘 저녁 반찬 아직 고민 중이시죠?", "이 가격 실화예요").',
      `- 맥락: 오늘은 ${now.month}월 ${now.date}일 ${WEEKDAYS[now.day]}요일. 계절·요일·끼니 상황과 상품 쓰임새(어떻게 먹으면 좋은지, 누구랑 먹으면 좋은지, 같이 사면 좋은 상품)를 엮어서 왜 지금 사야 하는지 이야기로.`,
      '- 설득: 아낀 금액은 주어진 계산값으로 "만 원 넘게 아끼시는 거예요"처럼 체감되게. 행사 기간이 있으면 끝나는 날을 짚어 긴박감.',
      '- 지금 안 사면 놓칠 것 같은 느낌: "이 가격이면 금방 빠져요", "늦으면 아쉬우실 거예요", "보이실 때 바로 담으세요", "지금 담아 가시는 분이 이득이에요" 같은 표현을 단락마다 하나씩, 매번 다르게. 단, "한정 수량 ○개", "곧 품절", "마감 임박" 같은 수량·재고 사실은 데이터에 있을 때만.',
      '- 마지막 단락: 핵심 혜택 한 번 더 + 기간 + "지금 바로 담아 가세요" 행동 유도로 힘 있게 마무리.',
      '',
      '[생동감]',
      '- 홈쇼핑 마감 직전처럼 들뜨고 에너지 넘치게: 감탄("와!", "세상에", "대박이죠?"), 손님에게 바로 거는 말("여러분 이거 보셨어요?"), 짧고 힘 있는 문장, 리듬감 있는 반복("싸다, 싸다, 정말 싸요!").',
      '- 한 문장은 짧게(대부분 20자 안팎). 느슨한 설명·긴 수식어 없이 템포 있게 치고 나가기.',
      '- 귀에 박히는 후크를 방송마다 한 번: 짧은 구호를 두 번 받아 치듯 (예: "할인은 팍팍, 팍팍! 신선함은 꽉꽉, 꽉꽉!", "식탁은 풍성하게, 가격은 가볍게!"). 매번 새로 지어서, 예시를 그대로 쓰지 말 것.',
      '- 현장 말맛 참고: "장바구니 꽉꽉 채울 준비 되셨나요?", "득템 찬스!", "오늘 안 오면 손해죠!", "카드 꺼내면? 할인 팍팍!" 같은 신나는 마트 방송 입말.',
      '',
      '[사람처럼 — AI 티 금지]',
      '- 실제 쇼호스트 입말: "자, 여러분", "이거 보세요", "진짜예요", "솔직히 말씀드리면", "어머", "그쵸?" 같은 말맛. 말끝을 ~요/~죠/~거든요/~잖아요/~세요로 섞고, 같은 어미를 연달아 쓰지 마세요.',
      '- 문장은 짧게 끊어 호흡 있게. 나열식("첫째, 둘째"), 보고서 말투, "~입니다"만 반복, 번역투 금지.',
      '- 상투어 금지: "특별한 기회", "다양한", "최고의 품질", "놓치지 마세요"(한 번이면 OK), "만나보세요", "준비했습니다".',
      '- 상품마다 같은 틀을 반복하지 말고 상품별로 다른 포인트(맛·신선도·양·가성비·편리함)로 이야기.',
      '',
      '[정확성]',
      '- 상품명·가격·할인 조건·기간은 아래 데이터 그대로. 없는 가격·혜택·수량 한정·원산지를 지어내지 마세요.',
      '- 가격을 말할 때는 규격(중량·용량·개수·포장)을 꼭 같이: "백 그램에 삼천구백구십 원", "이 킬로 한 박스에 만 구천구백 원", "다섯 개 묶음이 삼천구백팔십 원". 규격이 없는 상품만 가격만 말하기.',
      '- 정상가가 있으면 "원래 오천구백구십 원인데 오늘은 삼천구백구십 원"처럼 정상가→행사가 순서로 차이가 들리게. 혜택 조건(엘포인트·행사카드·몇 개 이상)은 가격과 붙여서 누가 받는지 분명히.',
      '- 귀로 듣는 방송: 숫자는 한글로 풀어 쓰기 (14,900원 → 만 사천구백 원, 500g → 오백 그램, 1+1 → 원 플러스 원, 30% → 삼십 퍼센트, L.POINT → 엘포인트, 10/18 → 시월 십팔일). 괄호·기호·이모지 금지.',
      '',
      wantTheme === '자동' ? `theme: 상품과 날짜를 보고 ${themes.join(', ')} 중 하나` : `theme: "${wantTheme}" (이 분위기로)`,
      'tone: 성우에게 줄 말투 지시 한 문장 (한국어)',
      'music: 배경음악 설명 영어 한 문장 (장르·악기·빠르기·분위기, soft and light, instrumental only, no vocals)',
      note ? `마지막 확인: 담당자 추가 요청사항(${note.slice(0, 80)}${note.length > 80 ? '…' : ''})이 원고에 모두 들어갔는지 다시 보고 JSON을 내세요.` : '',
      'JSON으로만: {"title":"방송 제목(짧게)","theme":"","tone":"","music":"","segments":[{"lines":[{"who":0,"text":"대사"}]}]}',
      '',
      '[행사상품]',
      ...items.map(itemFacts),
    ].filter(s => s !== '').join('\n');

    try {
      const response = await genAI.models.generateContent({ model: AI_MODEL, config: { responseMimeType: 'application/json', temperature: 1 }, contents: [{ parts: [{ text: prompt }] }] });
      const raw = parseJson<Record<string, any>>(response.text);
      const theme = (themes.includes(raw.theme) ? raw.theme : wantTheme !== '자동' ? wantTheme : '주말특가') as BroadcastScript['theme'];
      let list = cleanSegments(raw.segments, hosts.length);
      if (!list.length) return res.status(502).json({ error: '방송 원고를 만들지 못했습니다. 다시 시도해 주세요.' });
      list = await removePlaces(list, hosts.length);
      list = stripPlaces(await addBrand(list, hosts.length)); // 롯데마트 보완 후에도 위치가 다시 들어가지 않게
      if (!list.length) return res.status(502).json({ error: '방송 원고를 만들지 못했습니다. 다시 시도해 주세요.' });
      list = await fillGaps(list, items, !note, hosts.length);
      res.json({
        title: text(raw.title, 40) || `${theme} 안내 방송`,
        theme, hosts, pace, voiceStyle,
        tone: text(raw.tone, 120) || THEME_STYLE[theme].tone,
        music: text(raw.music, 300) || THEME_STYLE[theme].music,
        segments: list,
      } satisfies BroadcastScript);
    } catch (e) {
      console.error('MartON broadcast script error:', e);
      res.status(502).json({ error: '방송 원고를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  });

  /** 등록된 직원들의 점포명 (화명점, 화명 점 …) */
  const knownStores = () => [...new Set(Object.values(db.staff).map(s => normalizeStore(s.store)).filter(Boolean))];
  const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /** 규칙으로 확실히 지운다: 점포명은 빼고, 층·코너·매대 위치가 든 문장은 통째로 뺀다 */
  function stripPlaces(list: BroadcastSegment[]): BroadcastSegment[] {
    const stores = knownStores().map(st => new RegExp(`${esc(st.slice(0, -1))}\\s?점\\s?(?:에서는|에서|의|에|은|는)?\\s*`, 'g'));
    return list.flatMap(seg => {
      const lines = seg.lines.flatMap(l => {
        let t = l.text.replace(new RegExp(`${BRAND}\\s*[가-힣A-Za-z]{1,8}\\s?점(?![포수심원])`, 'g'), BRAND);
        for (const re of stores) t = t.replace(re, '');
        t = t.replace(/[가-힣]{1,8}점\s*(고객|손님)/g, '$1');
        t = t.split(/(?<=[.!?~…])\s+/).filter(x => !PLACE_WORDS.test(x)).join(' ').replace(/\s+/g, ' ').trim();
        return t ? [{ ...l, text: t }] : [];
      });
      return lines.length ? [{ lines }] : [];
    });
  }

  /** 점포명·위치가 들어간 단락은 AI로 한 번 다시 쓰게 하고, 그래도 남으면 규칙으로 지운다 (공용 방송) */
  async function removePlaces(list: BroadcastSegment[], hostCount: number) {
    const storeRe = knownStores().length ? new RegExp(knownStores().map(st => `${esc(st.slice(0, -1))}\\s?점`).join('|')) : null;
    const bad = (seg: BroadcastSegment) => hasPlaceMention(seg) || Boolean(storeRe && seg.lines.some(l => storeRe.test(l.text)));
    const hits = list.map((seg, i) => (bad(seg) ? i : -1)).filter(i => i >= 0);
    if (!hits.length) return list;
    const out = [...list];
    try {
      const response = await genAI.models.generateContent({
        model: AI_MODEL,
        config: { responseMimeType: 'application/json' },
        contents: [{ parts: [{ text: `아래 매장 방송 단락들은 전국 ${BRAND} 어느 점포에서나 트는 공용 방송인데, 점포 이름(○○점)이나 층·코너·매대·입구 같은 매장 위치가 들어가 있습니다. 그 부분만 빼고 같은 말맛·길이로 자연스럽게 고치세요. "${BRAND}"는 단락마다 한 번 남기고, 다른 내용·순서·who는 바꾸지 마세요.\nJSON으로만: {"segments":[{"lines":[{"who":0,"text":""}]}]}\n\n${JSON.stringify({ segments: hits.map(i => list[i]) })}` }] }],
      });
      const fixed = cleanSegments(parseJson<{ segments?: unknown }>(response.text).segments, hostCount);
      hits.forEach((i, k) => { if (fixed[k]) out[i] = fixed[k]; });
    } catch (e) {
      console.error('MartON broadcast place fix error:', e);
    }
    return stripPlaces(out);
  }

  /** 빠진 상품·가격이 있으면 AI에게 한 번 채워 넣게 한다 (그래도 남으면 화면에서 표시) */
  async function fillGaps(list: BroadcastSegment[], items: FlyerItem[], expectAll: boolean, hostCount: number) {
    const gaps = scriptGaps(list, items, expectAll);
    if (!gaps.length) return list;
    const todo = gaps.map(g => {
      const it = items.find(x => x.name === g.name)!;
      const price = g.price ? `${it.spec ? `${it.spec} ` : ''}${koreanNumber(g.price)} 원` : '';
      return g.problem === 'missing'
        ? `- "${g.name}" 상품이 원고에 없습니다. 넣으세요: ${itemFacts(it)}${price ? ` (가격은 "${price}"처럼 한글로)` : ''}`
        : `- "${g.name}"의 가격이 원고에 없습니다. 그 상품을 말하는 곳에 "${price}"를 넣으세요.${it.condition ? ` 혜택(${it.condition})도 빠졌으면 함께.` : ''}`;
    });
    try {
      const response = await genAI.models.generateContent({
        model: AI_MODEL,
        config: { responseMimeType: 'application/json' },
        contents: [{ parts: [{ text: `아래 매장 방송 원고를 고치세요. 빠진 것을 채우는 것 말고는 말맛·순서·who를 그대로 두고, 필요하면 대사나 단락을 덧붙여도 됩니다. 숫자는 한글로, "${BRAND}"는 단락마다 한 번, 점포명·매대 위치는 넣지 않기.\n${todo.join('\n')}\nJSON으로만: {"segments":[{"lines":[{"who":0,"text":""}]}]}\n\n${JSON.stringify({ segments: list })}` }] }],
      });
      const fixed = stripPlaces(cleanSegments(parseJson<{ segments?: unknown }>(response.text).segments, hostCount));
      // 고친 원고가 더 나을 때만 바꾼다
      return fixed.length && scriptGaps(fixed, items, expectAll).length < gaps.length ? await addBrand(fixed, hostCount) : list;
    } catch (e) {
      console.error('MartON broadcast gap fill error:', e);
      return list;
    }
  }

  /** "롯데마트"가 빠진 단락만 골라 자연스럽게 한 번 넣어 다시 쓰게 한다 (실패하면 그대로 두고 화면에서 표시) */
  async function addBrand(list: BroadcastSegment[], hostCount: number) {
    const missing = list.map((s, i) => (hasBrand(s) ? -1 : i)).filter(i => i >= 0);
    if (!missing.length) return list;
    try {
      const response = await genAI.models.generateContent({
        model: AI_MODEL,
        config: { responseMimeType: 'application/json' },
        contents: [{ parts: [{ text: `아래 매장 방송 단락들에 "${BRAND}"가 빠져 있습니다. 각 단락의 한 대사에 "${BRAND}"를 딱 한 번, 원래 말맛을 살려 자연스럽게 넣어 고치세요 (예: "${BRAND}에서만", "${BRAND}에서 지금 바로". 점포 이름·코너·매대 위치는 넣지 말 것). 다른 내용·순서·who는 바꾸지 마세요.\nJSON으로만: {"segments":[{"lines":[{"who":0,"text":""}]}]}\n\n${JSON.stringify({ segments: missing.map(i => list[i]) })}` }] }],
      });
      const fixed = cleanSegments(parseJson<{ segments?: unknown }>(response.text).segments, hostCount);
      const out = [...list];
      missing.forEach((i, k) => { if (fixed[k] && hasBrand(fixed[k])) out[i] = fixed[k]; });
      return out;
    } catch (e) {
      console.error('MartON broadcast brand fix error:', e);
      return list;
    }
  }

  // 1-2) 원고 한 단락만 다시 쓰기 (직원 지시: "더 짧게", "가격 강조" 등). 앞뒤 단락과 이어지게, 사실은 그대로
  app.post(`${api}/ai/broadcast/rewrite`, auth, async (req, res) => {
    if (!aiEnabled) return res.status(503).json(noKey);
    const hosts = cleanHosts(req.body.hosts);
    const [segment] = cleanSegments([{ lines: req.body.lines }], hosts.length);
    if (!segment) return res.status(400).json({ error: '다시 쓸 단락이 비어 있습니다.' });
    const instruction = text(req.body.instruction, 200) || '같은 내용을 더 생동감 있고 자연스럽게';
    const before = text(req.body.before, 400), after = text(req.body.after, 400);
    const items = cleanItems(req.body.items);
    const duo = hosts.length > 1;
    try {
      const response = await genAI.models.generateContent({
        model: AI_MODEL,
        config: { responseMimeType: 'application/json', temperature: 1 },
        contents: [{ parts: [{ text: [
          `${BRAND} 매장 방송 원고의 한 단락만 다시 쓰세요. 지시: ${instruction}`,
          `- 홈쇼핑 쇼호스트 입말, 짧고 생동감 있게. 숫자는 한글로 풀어 쓰기. "${BRAND}"는 딱 한 번. 점포 이름·층·코너·매대 위치는 넣지 않기.`,
          '- 가격·혜택·기간은 아래 행사상품 데이터와 지금 단락에 있는 사실만. 없는 내용을 지어내지 마세요.',
          '- 지시에 길이 말이 없으면 지금 단락과 비슷한 길이로. 앞뒤 단락과 자연스럽게 이어지게, 같은 말을 반복하지 않게.',
          duo ? `- 진행자 2명 대화(who 0: ${hostLabel(hosts[0])}, who 1: ${hostLabel(hosts[1])}). 주고받는 형식 유지.` : '- 진행자 1명, who는 모두 0.',
          before && `[앞 단락] ${before}`,
          `[다시 쓸 단락] ${JSON.stringify(segment)}`,
          after && `[뒤 단락] ${after}`,
          items.length ? `[행사상품]\n${items.map(itemFacts).join('\n')}` : '',
          'JSON으로만: {"lines":[{"who":0,"text":""}]}',
        ].filter(Boolean).join('\n') }] }],
      });
      const [fresh] = cleanSegments([{ lines: parseJson<{ lines?: unknown }>(response.text).lines }], hosts.length);
      if (!fresh) return res.status(502).json({ error: '단락을 다시 쓰지 못했습니다. 다시 시도해 주세요.' });
      const [done] = stripPlaces(await addBrand(await removePlaces([fresh], hosts.length), hosts.length));
      if (!done) return res.status(502).json({ error: '단락을 다시 쓰지 못했습니다. 다시 시도해 주세요.' });
      res.json(done satisfies BroadcastSegment);
    } catch (e) {
      console.error('MartON broadcast rewrite error:', e);
      res.status(502).json({ error: '단락을 다시 쓰지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  });

  // 2) 단락 하나를 음성으로 (단락별로 나눠 보내 응답이 커지지 않게). 진행자 2명이면 다중 화자
  app.post(`${api}/ai/broadcast/speech`, auth, async (req, res) => {
    if (!aiEnabled) return res.status(503).json(noKey);
    const hosts = cleanHosts(req.body.hosts);
    const [segment] = cleanSegments([{ lines: req.body.lines }], hosts.length);
    if (!segment) return res.status(400).json({ error: '읽을 원고가 비어 있습니다.' });
    const tone = text(req.body.tone, 120) || '밝고 친근하게';
    const pace: Pace = isPace(req.body.pace) ? req.body.pace : 'normal';
    const style: VoiceStyle = isVoiceStyle(req.body.voiceStyle) ? req.body.voiceStyle : 'natural';
    const duo = hosts.length > 1 && segment.lines.some(l => l.who === 1);
    const transcript = duo ? segment.lines.map(l => `${SPEAKER_NAMES[l.who]}: ${l.text}`).join('\n') : segment.lines.map(l => l.text).join('\n');
    const voiceOf = (h: Host) => ({ prebuiltVoiceConfig: { voiceName: hostVoice(h, style).voice } });
    const solo = hosts[segment.lines[0].who] ?? hosts[0];
    try {
      const response = await withModels(candidates('MARTON_TTS_MODEL', TTS_MODELS), model => genAI.models.generateContent({
        model,
        contents: [{ parts: [{ text: speechPrompt(duo ? hosts : [solo], style, tone, pace, transcript) }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: duo
            ? { languageCode: 'ko-KR', multiSpeakerVoiceConfig: { speakerVoiceConfigs: hosts.map((h, i) => ({ speaker: SPEAKER_NAMES[i], voiceConfig: voiceOf(h) })) } }
            : { languageCode: 'ko-KR', voiceConfig: voiceOf(solo) },
        },
      }));
      const part = audioPart(response);
      if (!part) return res.status(502).json({ error: '음성을 만들지 못했습니다. 다시 시도해 주세요.' });
      const rate = Number(/rate=(\d+)/.exec(part.mimeType)?.[1]) || 24000;
      res.json({ audio: part.data, sampleRate: rate } satisfies BroadcastSpeech);
    } catch (e) {
      console.error('MartON broadcast speech error:', e);
      res.status(502).json({ error: '음성을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  });

  // 3) 행사 분위기 배경음악 (목소리를 덮지 않는 잔잔한 연주곡)
  app.post(`${api}/ai/broadcast/music`, auth, async (req, res) => {
    if (!aiEnabled) return res.status(503).json(noKey);
    const style = text(req.body.music, 300);
    if (!style) return res.status(400).json({ error: '배경음악 설명이 비어 있습니다.' });
    const seconds = Math.min(MAX_SECONDS, Math.max(30, Math.round(Number(req.body.seconds) || 120)));
    const today = storeDayStart(Date.now());
    if (musicUsed.day !== today) Object.assign(musicUsed, { day: today, count: 0 });
    if (musicUsed.count >= MUSIC_DAILY_LIMIT()) return res.status(429).json({ error: `배경음악은 하루 ${MUSIC_DAILY_LIMIT()}곡까지 만들 수 있습니다. 내일 다시 만들거나 음성만으로 방송을 만들어 주세요.` });
    musicUsed.count++;
    try {
      const response = await withModels(candidates('MARTON_MUSIC_MODEL', MUSIC_MODELS), model => genAI.models.generateContent({
        model,
        contents: [{ parts: [{ text: musicPrompt(style, seconds) }] }],
        config: { responseModalities: ['AUDIO', 'TEXT'] },
      }));
      const part = audioPart(response);
      if (!part) { musicUsed.count--; return res.status(502).json({ error: '배경음악을 만들지 못했습니다. 다시 시도해 주세요.' }); }
      res.json({ audio: part.data, mimeType: part.mimeType.split(';')[0] } satisfies BroadcastMusic);
    } catch (e) {
      musicUsed.count--;
      console.error('MartON broadcast music error:', e);
      res.status(502).json({ error: '배경음악을 만들지 못했습니다. 음성만으로 방송을 만들 수 있습니다.' });
    }
  });
}
