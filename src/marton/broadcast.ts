// 행사 매장 방송: 전단 행사상품 → 쇼호스트 말투의 안내 멘트(TTS, 1인 또는 2인 대화) + 배경음악 → 1~3분 방송 파일
import type { FlyerItem } from './shared';

/** 방송에 꼭 들어가는 매장 이름 (단락마다 한 번) */
export const BRAND = '롯데마트';

export const BROADCAST_THEMES = ['자동', '타임세일', '주말특가', '명절', '신선식품', '시즌행사', '창립·오픈'] as const;
export type BroadcastTheme = (typeof BROADCAST_THEMES)[number];

/** 행사 분위기별 기본 말투·음악 */
export const THEME_STYLE: Record<Exclude<BroadcastTheme, '자동'>, { tone: string; music: string }> = {
  '타임세일': { tone: '마감 직전처럼 다급하고 신나게, 지금 안 오면 놓친다는 긴박감으로', music: 'energetic funky pop, 126 bpm, tight drums, slap bass and short brass hits, exciting time-sale shopping rush' },
  '주말특가': { tone: '들뜨고 신나는 주말 기분으로, 손님을 끌어당기듯 활기차게', music: 'upbeat bouncy pop, 120 bpm, claps, bright synths and plucky guitar, happy weekend shopping spree vibe' },
  '명절': { tone: '명절 장 보는 설렘을 살려 밝고 힘차게, 넉넉한 혜택을 자랑하듯', music: 'festive upbeat Korean fusion, 112 bpm, lively janggu groove, gayageum riffs and bright strings, joyful holiday shopping energy' },
  '신선식품': { tone: '막 들어온 신선함을 자랑하듯 자신 있고 생기 있게', music: 'fresh upbeat acoustic pop, 116 bpm, marimba, whistles and crisp handclaps, lively market morning energy' },
  '시즌행사': { tone: '계절 행사에 들뜬 목소리로 화사하고 신나게', music: 'catchy feel-good pop, 118 bpm, piano stabs, bells and four-on-the-floor beat, sparkling seasonal sale mood' },
  '창립·오픈': { tone: '큰 잔치를 알리듯 힘차고 신나게, 지금이 기회라는 느낌으로', music: 'celebratory upbeat pop, 122 bpm, brass fanfare hits, punchy drums and claps, grand sale festival energy' },
};

// ---- 쇼호스트 목소리: 성별 × 연령대 ----
export const HOST_GENDERS = ['여성', '남성'] as const;
export type HostGender = (typeof HOST_GENDERS)[number];
export const HOST_AGES = ['20대', '30대', '40대', '50대'] as const;
export type HostAge = (typeof HOST_AGES)[number];
export interface Host { gender: HostGender; age: HostAge }

/** Gemini TTS 기본 목소리 중 연령대 느낌이 맞는 것 + 성우에게 주는 인물 설명 */
export const HOST_VOICE: Record<HostGender, Record<HostAge, { voice: string; persona: string }>> = {
  여성: {
    '20대': { voice: 'Leda', persona: '20대 후반 여성 쇼호스트. 통통 튀고 친근한 언니 같은 말투, 리액션이 크고 웃음기 있는 목소리' },
    '30대': { voice: 'Laomedeia', persona: '30대 여성 홈쇼핑 메인 쇼호스트. 밝고 에너지 있으면서 신뢰감 있는 목소리, 살림 잘하는 사람처럼 공감하는 말투' },
    '40대': { voice: 'Sulafat', persona: '40대 여성 베테랑 쇼호스트. 따뜻하고 여유 있는 목소리, 주부의 마음을 잘 아는 노련한 말투' },
    '50대': { voice: 'Gacrux', persona: '50대 여성 베테랑 쇼호스트. 차분하고 기품 있는 목소리, 믿고 사도 된다는 느낌을 주는 푸근한 말투' },
  },
  남성: {
    '20대': { voice: 'Puck', persona: '20대 후반 남성 쇼호스트. 경쾌하고 재치 있는 동생 같은 말투, 리듬감 있게 치고 나가는 목소리' },
    '30대': { voice: 'Sadachbia', persona: '30대 남성 홈쇼핑 메인 쇼호스트. 활기차고 시원시원한 목소리, 확신 있게 추천하는 말투' },
    '40대': { voice: 'Achird', persona: '40대 남성 베테랑 쇼호스트. 친근하고 믿음직한 목소리, 가장의 눈높이로 꼼꼼하게 짚어 주는 말투' },
    '50대': { voice: 'Algieba', persona: '50대 남성 베테랑 쇼호스트. 중후하고 부드러운 목소리, 연륜이 느껴지는 여유 있는 말투' },
  },
};
export const hostLabel = (h: Host) => `${h.gender} ${h.age}`;

/** 목소리 느낌: 자연스럽게(기본) / 활기차고 경쾌하게(밝고 통통 튀는 목소리로 바꾸고 텐션을 올린다) */
export const VOICE_STYLES = [
  { id: 'natural', label: '자연스럽게' },
  { id: 'lively', label: '활기차고 경쾌하게' },
] as const;
export type VoiceStyle = (typeof VOICE_STYLES)[number]['id'];
export const isVoiceStyle = (v: unknown): v is VoiceStyle => VOICE_STYLES.some(x => x.id === v);
export const voiceStyleLabel = (v: VoiceStyle) => VOICE_STYLES.find(x => x.id === v)!.label;
/** 활기찬 쇼호스트용 목소리 (Gemini TTS 기본 목소리 중 밝고 업비트한 것) */
const LIVELY_VOICE: Record<HostGender, Record<HostAge, string>> = {
  여성: { '20대': 'Zephyr', '30대': 'Autonoe', '40대': 'Laomedeia', '50대': 'Aoede' },
  남성: { '20대': 'Fenrir', '30대': 'Puck', '40대': 'Sadachbia', '50대': 'Achird' },
};
const LIVELY_PERSONA = '평소보다 텐션을 한 단계 올린 활기차고 경쾌한 홈쇼핑 쇼호스트. 밝고 통통 튀는 목소리, 웃음이 섞인 하이텐션, 리듬감 있게 치고 나가는 진행';
export const hostVoice = (h: Host, style: VoiceStyle = 'natural') =>
  style === 'lively'
    ? { voice: LIVELY_VOICE[h.gender][h.age], persona: `${HOST_VOICE[h.gender][h.age].persona.split('.')[0]}. ${LIVELY_PERSONA}` }
    : HOST_VOICE[h.gender][h.age];
export const isHost = (v: any): v is Host => HOST_GENDERS.includes(v?.gender) && HOST_AGES.includes(v?.age);
/** TTS 다중 화자 이름 (원고에는 나오지 않는다) */
export const SPEAKER_NAMES = ['Speaker1', 'Speaker2'] as const;

export const MIN_SECONDS = 30;
export const MAX_SECONDS = 180;
export const LENGTH_CHOICES = [30, 60, 90, 120, 150, 180] as const;
export const lengthLabel = (s: number) => (s < 60 ? `${s}초` : s % 60 ? `${Math.floor(s / 60)}분 30초` : `${s / 60}분`);

/** 방송 구성 (초): 음악만 나오는 첫머리·끝, 멘트 사이 쉼 */
export const MUSIC_INTRO_S = 4;
export const MUSIC_OUTRO_S = 5;
export const SEGMENT_GAP_S = 2;
/** 말 빠르기: 공백 뺀 글자 기준 초당 글자 수와 성우 지시. 빠를수록 같은 길이에 더 많이 말한다 */
export const PACES = [
  { id: 'normal', label: '보통', cps: 6, direction: '' },
  { id: 'brisk', label: '조금 빠르게', cps: 6.8, direction: '평소보다 조금 빠른 템포로 경쾌하게 치고 나가기. 문장 사이 쉼은 짧게, 그래도 상품명·가격·숫자는 또렷하게.' },
  { id: 'fast', label: '빠르게', cps: 7.6, direction: '타임세일 생방송처럼 빠른 템포로 힘 있게 몰아가기. 쉼은 최소로, 그래도 가격·숫자는 한 글자씩 또렷하게.' },
] as const;
export type Pace = (typeof PACES)[number]['id'];
export const isPace = (v: unknown): v is Pace => PACES.some(p => p.id === v);
export const paceOf = (v: unknown) => PACES.find(p => p.id === v) ?? PACES[0];

/** 목표 길이·빠르기에 맞는 멘트 분량 (공백 뺀 글자 수) */
export function scriptBudget(seconds: number, pace: Pace = 'normal') {
  const segments = seconds < 45 ? 2 : Math.max(3, Math.min(9, Math.round(seconds / 22))); // 30초는 두 단락
  const speech = seconds - MUSIC_INTRO_S - MUSIC_OUTRO_S - SEGMENT_GAP_S * (segments - 1);
  return { segments, chars: Math.round(speech * paceOf(pace).cps) };
}

// ---- 원고 점검: 상품마다 이름·가격이 실제로 들어갔는지 (가격은 "삼천구백구십 원"처럼 한글로 읽는다) ----
const DIGIT = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const UNIT4 = ['', '십', '백', '천'];
function under10000(n: number) {
  let out = '';
  [...String(n)].reverse().forEach((d, i) => {
    const v = Number(d);
    if (v) out = (v === 1 && i > 0 ? '' : DIGIT[v]) + UNIT4[i] + out;
  });
  return out;
}
/** 3990 → 삼천구백구십, 19900 → 만구천구백, 125000 → 십이만오천 */
export function koreanNumber(n: number) {
  if (!Number.isFinite(n) || n <= 0) return '';
  const man = Math.floor(n / 10000), rest = n % 10000;
  return (man ? (man === 1 ? '' : under10000(man)) + '만' : '') + under10000(rest);
}
const squash = (t: string) => t.replace(/[\s,]/g, '').replace(/일만/g, '만').replace(/일천/g, '천');
/** 원고에 이 가격이 들어갔나 (한글 읽기 또는 숫자) */
export const priceSpoken = (text: string, price: number) => {
  const t = squash(text);
  return t.includes(koreanNumber(price)) || t.includes(String(price));
};
/** 원고에 이 상품이 나오나: 상품명의 두 글자 이상 낱말 중 하나라도 */
export function itemMentioned(text: string, name: string) {
  const t = text.replace(/\s+/g, '');
  const words = name.replace(/[()[\]/·,]/g, ' ').split(/\s+/).filter(w => w.length >= 2 && !/^\d/.test(w));
  return (words.length ? words : [name]).some(w => t.includes(w.replace(/\s+/g, '')));
}
/** 빠진 것 목록: 나온 상품인데 가격이 없음 / (추리기 지시가 없으면) 아예 안 나온 상품 */
export function scriptGaps(segments: BroadcastSegment[], items: FlyerItem[], expectAll: boolean) {
  const all = segments.map(segmentText).join(' ');
  const gaps: { name: string; problem: 'missing' | 'price'; price?: number }[] = [];
  for (const it of items) {
    if (!itemMentioned(all, it.name)) { if (expectAll) gaps.push({ name: it.name, problem: 'missing', price: it.price }); continue; }
    if (it.price && !priceSpoken(all, it.price)) gaps.push({ name: it.name, problem: 'price', price: it.price });
  }
  return gaps;
}

// ---- 한 줄 입력 → 상품명·규격·행사가·정상가·혜택·기간 ("노르웨이 생연어 100g 5,990원→3,990원 엘포인트 30% 10/16~10/22") ----
const AMOUNT = /(\d{1,3}(?:,\d{3})+|\d+)\s*원/g;
const SPEC = /\d+(?:\.\d+)?\s*(?:kg|g|ml|l|리터|그램|킬로그램|킬로|개입|입|개|봉|팩|마리|미|구|송이|박스|판|포기|단|통|병|캔|인분|매|롤)(?:\s*[x×*]\s*\d+\s*(?:개|입|봉|팩|캔|병|ea)?)?(?:\s*\/\s*[가-힣a-z]+)*/i;
const PERIOD = /\d{1,2}[./]\d{1,2}\s*(?:\([월화수목금토일]\))?\s*[~-]\s*(?:\d{1,2}[./])?\d{1,2}\s*(?:\([월화수목금토일]\))?/;
const PROMO = /(?:\d+\s*\+\s*\d+|\d+\s*개\s*이상|(?:대한민국\s*)?수산\s*대전|농할|농축산물\s*할인|할인\s*지원|정부\s*할인|최종가|엘\s*포인트|L\.?\s*POINT|엘포|행사\s*카드|[가-힣]+카드|\d+\s*%|\d+\s*천\s*원\s*할인|할인|증정|덤|교차|한정|단독|이상\s*구매)/i;
const num = (s: string) => Number(s.replace(/,/g, ''));

export function parseItemLine(line: string): FlyerItem | null {
  let rest = line.replace(/\s+/g, ' ').trim();
  if (!rest) return null;
  const period = PERIOD.exec(rest)?.[0];
  if (period) rest = rest.replace(period, ' ');
  // 금액: "원"이 붙은 숫자. 두 개면 큰 쪽이 정상가, 작은 쪽이 행사가
  const amounts = [...rest.matchAll(AMOUNT)].map(m => ({ text: m[0], n: num(m[1]) })).filter(a => a.n >= 10 && a.n < 1e8);
  let price: number | undefined, originalPrice: number | undefined;
  if (amounts.length) {
    const sorted = [...amounts].sort((a, b) => a.n - b.n);
    price = sorted[0].n;
    if (sorted.length > 1 && sorted.at(-1)!.n > price) originalPrice = sorted.at(-1)!.n;
    for (const a of amounts) rest = rest.replace(a.text, ' ');
    rest = rest.replace(/\s*(?:→|->|>)\s*/g, ' ');
  } else {
    // "원" 없이 쓴 가격: 단위·%·+가 붙지 않은 세 자리 이상 숫자
    const bare = /(?:^|\s)(\d{1,3}(?:,\d{3})+|\d{3,})(?=\s|$)/.exec(rest);
    if (bare) { price = num(bare[1]); rest = rest.replace(bare[1], ' '); }
  }
  const spec = SPEC.exec(rest)?.[0]?.replace(/\s+/g, '');
  if (spec) rest = rest.replace(SPEC, ' ');
  // 혜택: 첫 행사 표시부터 끝까지
  const promoAt = rest.search(PROMO);
  const condition = promoAt >= 0 ? rest.slice(promoAt).replace(/\s+/g, ' ').trim() : undefined;
  if (promoAt >= 0) rest = rest.slice(0, promoAt);
  const name = rest.replace(/[/,·|()[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name) return null;
  return { name, spec, price, originalPrice, condition: condition || undefined, period: period?.replace(/\s+/g, '') };
}

/** 대사 한 줄. who: 0 = 첫 번째 진행자, 1 = 두 번째 진행자 */
export interface BroadcastLine { who: 0 | 1; text: string }
export interface BroadcastSegment { lines: BroadcastLine[] }
export const segmentText = (s: BroadcastSegment) => s.lines.map(l => l.text).join(' ');
export const hasBrand = (s: BroadcastSegment) => segmentText(s).includes(BRAND);
/** 전국 공용 방송이라 넣지 않는 위치 표현: 층·코너·매대·진열 위치 */
export const PLACE_WORDS = /\d+\s*번\s*(?:매대|칸|통로)|\d+\s*번째\s*칸|매대|진열대|코너|지하\s*\d*\s*층|\d+\s*층|입구\s*(?:쪽|앞)|계산대\s*(?:앞|옆|쪽)/;
/** 점포명: "롯데마트 ○○점", "○○점 고객 여러분" */
export const STORE_WORDS = new RegExp(`${BRAND}\\s*[가-힣A-Za-z]{1,8}\\s?점(?![포수심원])|[가-힣]{1,8}점\\s*(?:고객|손님)`);
export const hasPlaceMention = (s: BroadcastSegment) => s.lines.some(l => PLACE_WORDS.test(l.text) || STORE_WORDS.test(l.text));

export interface BroadcastScript {
  title: string;
  theme: Exclude<BroadcastTheme, '자동'>;
  /** 진행자 1명 또는 2명 (2명이면 주고받는 대화) */
  hosts: Host[];
  /** 말투 지시 */
  tone: string;
  /** 말 빠르기 */
  pace: Pace;
  /** 목소리 느낌 */
  voiceStyle: VoiceStyle;
  /** 배경음악 설명 (영어, 음악 생성 AI용) */
  music: string;
  segments: BroadcastSegment[];
}

export interface BroadcastScriptRequest {
  items: FlyerItem[];
  seconds: number;
  theme: BroadcastTheme;
  hosts: Host[];
  pace: Pace;
  voiceStyle: VoiceStyle;
  /** 덧붙일 말 (선택) */
  note?: string;
}

/** TTS 응답: 24kHz 16비트 모노 PCM (base64) */
export interface BroadcastSpeech { audio: string; sampleRate: number }
/** 배경음악 응답: mp3·wav (base64) */
export interface BroadcastMusic { audio: string; mimeType: string }
