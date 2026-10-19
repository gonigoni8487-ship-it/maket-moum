// 마트ON 행사 매장 방송: 행사상품 → 쇼호스트 원고(AI 작성) → 음성(Gemini TTS, 1인·2인 대화) + 배경음악(Lyria). 합치기는 기기에서 한다.
import type { GoogleGenAI } from '@google/genai';
import {
  BRAND, BROADCAST_THEMES, THEME_STYLE, HOST_VOICE, SPEAKER_NAMES, MIN_SECONDS, MAX_SECONDS, scriptBudget, hasBrand, isHost, hostLabel, isPace, paceOf, type Pace,
  type BroadcastScript, type BroadcastSegment, type BroadcastTheme, type BroadcastMusic, type BroadcastSpeech, type Host,
} from '../src/marton/broadcast';
import { bayText, matchProduct, storeDayStart, storeTime, type FlyerItem } from '../src/marton/shared';
import { platform } from './platform';
import { auth, db, text, parseJson, type AuthedRequest, type RouteApp } from './marton';

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

/** 원고에 넣을 사실: 전단 내용 + 아낀 금액(계산) + 매장 위치(상품 DB). AI가 지어내지 않도록 근거를 다 준다 */
function itemFacts(it: FlyerItem) {
  const save = it.originalPrice && it.price && it.originalPrice > it.price ? it.originalPrice - it.price : 0;
  const product = matchProduct(it, db.products);
  return [
    it.name, it.spec && `(${it.spec})`,
    it.price && `행사가 ${won(it.price)}`, it.originalPrice && `정상가 ${won(it.originalPrice)}`,
    save && `${won(save)} 저렴 (${Math.round(save / it.originalPrice! * 100)}%)`,
    it.condition && `혜택 ${it.condition}`, it.period && `기간 ${it.period}`,
    product && `매장 위치 ${product.floor} ${product.corner} ${bayText(product)}`,
  ].filter(Boolean).join(' / ');
}

function cleanItems(input: unknown): FlyerItem[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 40).flatMap((it: any) => {
    const name = text(it?.name, 60);
    if (!name) return [];
    const n = (v: unknown) => (typeof v === 'number' && v > 0 && v < 1e8 ? Math.round(v) : undefined);
    return [{ name, code: text(it?.code, 20) || undefined, spec: text(it?.spec, 40) || undefined, price: n(it?.price), originalPrice: n(it?.originalPrice), condition: text(it?.condition, 100) || undefined, period: text(it?.period, 40) || undefined }];
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
function speechPrompt(hosts: Host[], tone: string, pace: Pace, transcript: string) {
  const people = hosts.map((h, i) => `${hosts.length > 1 ? `${SPEAKER_NAMES[i]}: ` : ''}${HOST_VOICE[h.gender][h.age].persona}`);
  return [
    '# AUDIO PROFILE',
    ...people,
    '## THE SCENE',
    `${BRAND} 매장 스피커로 나가는 홈쇼핑 생방송 스타일의 행사 안내. 장 보는 손님들이 걸음을 멈추고 귀 기울이게 만드는 방송.`,
    '### DIRECTOR\'S NOTES',
    `말투: ${tone}.`,
    paceOf(pace).direction && `빠르기: ${paceOf(pace).direction}`,
    '원고를 읽는 느낌이 절대 나면 안 됨. 실제 쇼호스트가 카메라 앞에서 즉석으로 말하듯 자연스럽게, 숨 쉬는 타이밍과 미소가 들리게.',
    '문장마다 억양과 빠르기에 변화를 주고, 가격·할인·"롯데마트"에서는 살짝 힘을 주고 반 박자 쉬었다 가기. 기계처럼 일정한 속도와 높낮이 금지.',
    hosts.length > 1 ? '두 사람은 오래 호흡을 맞춘 진행자 콤비. 상대 말에 진짜로 반응하듯 맞장구와 리액션을 살려서, 말이 끝나자마자 자연스럽게 받기.' : '',
    '#### TRANSCRIPT',
    transcript,
  ].filter(Boolean).join('\n');
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
    const note = text(req.body.note, 100);
    const pace: Pace = isPace(req.body.pace) ? req.body.pace : 'normal';
    const store = text((req as AuthedRequest).staff.store, 20);
    const { segments, chars } = scriptBudget(seconds, pace);
    const themes = Object.keys(THEME_STYLE);
    const now = storeTime(Date.now());

    const prompt = [
      `당신은 ${BRAND} 매장 방송 대본을 쓰는 10년 차 홈쇼핑 쇼호스트 작가입니다. 아래 행사상품으로 매장 스피커에서 나갈 방송 대본을 쓰세요.`,
      duo
        ? `진행자 2명이 주고받는 대화입니다. 진행자1(who 0)은 ${hostLabel(hosts[0])}, 진행자2(who 1)는 ${hostLabel(hosts[1])} 쇼호스트. 한 사람이 질문하거나 감탄하면 다른 사람이 받아서 혜택을 풀어 주는 식으로, 대사는 한 번에 1~2문장씩 번갈아. 서로 이름은 부르지 마세요.`
        : `진행자 1명(${hostLabel(hosts[0])} 쇼호스트)이 손님에게 직접 말을 거는 방송입니다. lines의 who는 모두 0.`,
      '',
      '[분량]',
      `- 공백 뺀 글자 수로 약 ${chars}자 (±10%). 방송 ${Math.round(seconds / 6) / 10}분에 맞춘 분량이니 꼭 지키세요.`,
      `- ${segments}개 단락. 단락 사이에는 배경음악만 잠깐 나옵니다. 상품이 적으면 핵심 상품을 다른 각도로 한 번 더 짚는 단락을 넣으세요.`,
      '',
      `[${BRAND} — 반드시 지킬 것]`,
      `- 모든 단락에 "${BRAND}"를 딱 한 번씩, 문장 속에 자연스럽게 (예: "${BRAND}에서만 이 가격", "${BRAND} 수산 코너로 오세요", "${BRAND} 엘포인트 회원님이라면"). 한 단락에 두 번 이상은 금지.`,
      store ? `- 첫 단락에서 한 번은 "${BRAND} ${store}"처럼 점포 이름까지.` : '',
      '',
      '[후킹·설득·맥락 — 자동으로 넣을 것]',
      '- 첫 마디는 귀를 잡는 후킹: 손님 상황을 짚는 질문이나 놀라운 숫자로 시작 (예: "오늘 저녁 반찬 아직 고민 중이시죠?", "이 가격 실화예요").',
      `- 맥락: 오늘은 ${now.month}월 ${now.date}일 ${WEEKDAYS[now.day]}요일. 계절·요일·끼니 상황과 상품 쓰임새(어떻게 먹으면 좋은지, 누구랑 먹으면 좋은지, 같이 사면 좋은 상품)를 엮어서 왜 지금 사야 하는지 이야기로.`,
      '- 설득: 아낀 금액은 주어진 계산값으로 "만 원 넘게 아끼시는 거예요"처럼 체감되게. 행사 기간이 있으면 끝나는 날을 짚어 긴박감. 매장 위치가 있으면 "어디로 오시면 된다"로 행동 유도.',
      '- 마지막 단락: 핵심 혜택 한 번 더 + 기간 + 지금 바로 오시라는 마무리.',
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
      note ? `원고에 꼭 반영할 내용: ${note}` : '',
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
      list = await addBrand(list, hosts.length);
      res.json({
        title: text(raw.title, 40) || `${theme} 안내 방송`,
        theme, hosts, pace,
        tone: text(raw.tone, 120) || THEME_STYLE[theme].tone,
        music: text(raw.music, 300) || THEME_STYLE[theme].music,
        segments: list,
      } satisfies BroadcastScript);
    } catch (e) {
      console.error('MartON broadcast script error:', e);
      res.status(502).json({ error: '방송 원고를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  });

  /** "롯데마트"가 빠진 단락만 골라 자연스럽게 한 번 넣어 다시 쓰게 한다 (실패하면 그대로 두고 화면에서 표시) */
  async function addBrand(list: BroadcastSegment[], hostCount: number) {
    const missing = list.map((s, i) => (hasBrand(s) ? -1 : i)).filter(i => i >= 0);
    if (!missing.length) return list;
    try {
      const response = await genAI.models.generateContent({
        model: AI_MODEL,
        config: { responseMimeType: 'application/json' },
        contents: [{ parts: [{ text: `아래 매장 방송 단락들에 "${BRAND}"가 빠져 있습니다. 각 단락의 한 대사에 "${BRAND}"를 딱 한 번, 원래 말맛을 살려 자연스럽게 넣어 고치세요 (예: "${BRAND}에서만", "${BRAND} ○○ 코너"). 다른 내용·순서·who는 바꾸지 마세요.\nJSON으로만: {"segments":[{"lines":[{"who":0,"text":""}]}]}\n\n${JSON.stringify({ segments: missing.map(i => list[i]) })}` }] }],
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

  // 2) 단락 하나를 음성으로 (단락별로 나눠 보내 응답이 커지지 않게). 진행자 2명이면 다중 화자
  app.post(`${api}/ai/broadcast/speech`, auth, async (req, res) => {
    if (!aiEnabled) return res.status(503).json(noKey);
    const hosts = cleanHosts(req.body.hosts);
    const [segment] = cleanSegments([{ lines: req.body.lines }], hosts.length);
    if (!segment) return res.status(400).json({ error: '읽을 원고가 비어 있습니다.' });
    const tone = text(req.body.tone, 120) || '밝고 친근하게';
    const pace: Pace = isPace(req.body.pace) ? req.body.pace : 'normal';
    const duo = hosts.length > 1 && segment.lines.some(l => l.who === 1);
    const transcript = duo ? segment.lines.map(l => `${SPEAKER_NAMES[l.who]}: ${l.text}`).join('\n') : segment.lines.map(l => l.text).join('\n');
    const voiceOf = (h: Host) => ({ prebuiltVoiceConfig: { voiceName: HOST_VOICE[h.gender][h.age].voice } });
    const solo = hosts[segment.lines[0].who] ?? hosts[0];
    try {
      const response = await withModels(candidates('MARTON_TTS_MODEL', TTS_MODELS), model => genAI.models.generateContent({
        model,
        contents: [{ parts: [{ text: speechPrompt(duo ? hosts : [solo], tone, pace, transcript) }] }],
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
        contents: [{ parts: [{ text: `Instrumental background bed for in-store supermarket announcements with a voice-over on top, about ${seconds} seconds long. ${style}. No vocals, no lyrics, no singing, no spoken words. Keep it light and sparse in the midrange (no busy lead melody, no loud drums, no sudden drops or build-ups) so the speaking voice always stays in front. Steady volume and consistent mood throughout, with a clean ending.` }] }],
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
