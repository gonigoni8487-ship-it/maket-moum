// 행사 매장 방송: 전단 행사상품 → 쇼호스트 말투의 안내 멘트(TTS, 1인 또는 2인 대화) + 배경음악 → 1~3분 방송 파일
import type { FlyerItem } from './shared';

/** 방송에 꼭 들어가는 매장 이름 (단락마다 한 번) */
export const BRAND = '롯데마트';

export const BROADCAST_THEMES = ['자동', '타임세일', '주말특가', '명절', '신선식품', '시즌행사', '창립·오픈'] as const;
export type BroadcastTheme = (typeof BROADCAST_THEMES)[number];

/** 행사 분위기별 기본 말투·음악 */
export const THEME_STYLE: Record<Exclude<BroadcastTheme, '자동'>, { tone: string; music: string }> = {
  '타임세일': { tone: '지금 안 오면 놓친다는 긴박감, 빠른 템포로 신나게', music: 'light upbeat funk pop, 120 bpm, muted guitar and soft brass, playful time-sale mood' },
  '주말특가': { tone: '가족 나들이처럼 밝고 들뜬 기분으로', music: 'cheerful light acoustic pop, 105 bpm, ukulele, soft claps and glockenspiel, happy weekend mood' },
  '명절': { tone: '명절 인사를 건네듯 따뜻하고 넉넉하게', music: 'warm gentle Korean traditional fusion, soft gayageum melody over light strings, 90 bpm, cozy holiday mood' },
  '신선식품': { tone: '산지에서 막 들어온 걸 자랑하듯 자신 있고 산뜻하게', music: 'fresh light acoustic folk, 100 bpm, plucked guitar and marimba, clean morning market mood' },
  '시즌행사': { tone: '계절 분위기에 설레는 목소리로 화사하게', music: 'soft bright seasonal pop, 108 bpm, piano and light bells, warm celebratory mood' },
  '창립·오픈': { tone: '큰 잔치를 알리듯 힘차고 자랑스럽게', music: 'celebratory light orchestral pop, 112 bpm, soft brass and strings, festive mood' },
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
export const isHost = (v: any): v is Host => HOST_GENDERS.includes(v?.gender) && HOST_AGES.includes(v?.age);
/** TTS 다중 화자 이름 (원고에는 나오지 않는다) */
export const SPEAKER_NAMES = ['Speaker1', 'Speaker2'] as const;

export const MIN_SECONDS = 60;
export const MAX_SECONDS = 180;
export const LENGTH_CHOICES = [60, 90, 120, 150, 180] as const;
export const lengthLabel = (s: number) => (s % 60 ? `${Math.floor(s / 60)}분 30초` : `${s / 60}분`);

/** 방송 구성 (초): 음악만 나오는 첫머리·끝, 멘트 사이 쉼 */
export const MUSIC_INTRO_S = 4;
export const MUSIC_OUTRO_S = 5;
export const SEGMENT_GAP_S = 2;
/** 쇼호스트 말 빠르기: 공백 뺀 글자 기준 초당 약 6자 */
const CHARS_PER_SECOND = 6;

/** 목표 길이에 맞는 멘트 분량 (공백 뺀 글자 수) */
export function scriptBudget(seconds: number) {
  const segments = Math.max(3, Math.min(9, Math.round(seconds / 22)));
  const speech = seconds - MUSIC_INTRO_S - MUSIC_OUTRO_S - SEGMENT_GAP_S * (segments - 1);
  return { segments, chars: Math.round(speech * CHARS_PER_SECOND) };
}

/** 대사 한 줄. who: 0 = 첫 번째 진행자, 1 = 두 번째 진행자 */
export interface BroadcastLine { who: 0 | 1; text: string }
export interface BroadcastSegment { lines: BroadcastLine[] }
export const segmentText = (s: BroadcastSegment) => s.lines.map(l => l.text).join(' ');
export const hasBrand = (s: BroadcastSegment) => segmentText(s).includes(BRAND);

export interface BroadcastScript {
  title: string;
  theme: Exclude<BroadcastTheme, '자동'>;
  /** 진행자 1명 또는 2명 (2명이면 주고받는 대화) */
  hosts: Host[];
  /** 말투 지시 */
  tone: string;
  /** 배경음악 설명 (영어, 음악 생성 AI용) */
  music: string;
  segments: BroadcastSegment[];
}

export interface BroadcastScriptRequest {
  items: FlyerItem[];
  seconds: number;
  theme: BroadcastTheme;
  hosts: Host[];
  /** 덧붙일 말 (선택) */
  note?: string;
}

/** TTS 응답: 24kHz 16비트 모노 PCM (base64) */
export interface BroadcastSpeech { audio: string; sampleRate: number }
/** 배경음악 응답: mp3·wav (base64) */
export interface BroadcastMusic { audio: string; mimeType: string }
