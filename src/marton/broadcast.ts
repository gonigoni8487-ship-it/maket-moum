// 행사 매장 방송: 전단 행사상품 → 행사 분위기에 맞는 안내 멘트(TTS) + 배경음악 → 1~3분 방송 파일
import type { FlyerItem } from './shared';

export const BROADCAST_THEMES = ['자동', '타임세일', '주말특가', '명절', '신선식품', '시즌행사', '창립·오픈'] as const;
export type BroadcastTheme = (typeof BROADCAST_THEMES)[number];

/** 행사 분위기별 기본 말투·목소리·음악 (AI가 문구를 쓸 때와 사람이 고를 때 같이 쓴다) */
export const THEME_STYLE: Record<Exclude<BroadcastTheme, '자동'>, { tone: string; voice: string; music: string }> = {
  '타임세일': { tone: '빠르고 급하게, 지금 바로 오셔야 한다는 긴박감이 느껴지게 신나게', voice: 'Fenrir', music: 'upbeat energetic funk pop, fast tempo 128 bpm, bright brass stabs and slap bass, exciting supermarket time-sale mood' },
  '주말특가': { tone: '밝고 경쾌하게, 가족 나들이 같은 즐거운 분위기로', voice: 'Laomedeia', music: 'cheerful bright acoustic pop, 110 bpm, ukulele, claps and glockenspiel, happy weekend family shopping mood' },
  '명절': { tone: '따뜻하고 정겹게, 명절 인사를 건네듯 넉넉한 마음으로', voice: 'Sulafat', music: 'warm festive Korean traditional fusion, gayageum and daegeum melody over soft strings and light percussion, 96 bpm, joyful holiday mood' },
  '신선식품': { tone: '산뜻하고 믿음직하게, 신선함과 품질을 자신 있게 소개하듯', voice: 'Kore', music: 'fresh light acoustic folk, 104 bpm, plucked guitar, marimba and whistling, clean morning market mood' },
  '시즌행사': { tone: '설레고 화사하게, 계절 분위기를 살려 반갑게', voice: 'Autonoe', music: 'bright seasonal pop, 112 bpm, piano, sparkling bells and soft synth pads, warm celebratory mood' },
  '창립·오픈': { tone: '힘차고 자랑스럽게, 큰 잔치를 알리듯 웅장하고 활기차게', voice: 'Puck', music: 'grand celebratory orchestral pop, 120 bpm, brass fanfare, big drums and strings, festive grand opening mood' },
};

/** Gemini TTS 기본 목소리 중 매장 방송에 어울리는 것 */
export const BROADCAST_VOICES = [
  { id: 'auto', label: '행사에 맞게 자동' },
  { id: 'Laomedeia', label: '밝은 여성' },
  { id: 'Kore', label: '또렷한 여성' },
  { id: 'Sulafat', label: '따뜻한 여성' },
  { id: 'Puck', label: '경쾌한 남성' },
  { id: 'Fenrir', label: '신나는 남성' },
  { id: 'Charon', label: '차분한 남성' },
] as const;
export const VOICE_IDS: readonly string[] = ['Laomedeia', 'Kore', 'Sulafat', 'Puck', 'Fenrir', 'Charon', 'Autonoe'];

export const MIN_SECONDS = 60;
export const MAX_SECONDS = 180;
export const LENGTH_CHOICES = [60, 90, 120, 150, 180] as const;
export const lengthLabel = (s: number) => (s % 60 ? `${Math.floor(s / 60)}분 30초` : `${s / 60}분`);

/** 방송 구성 (초): 음악만 나오는 첫머리·끝, 멘트 사이 쉼 */
export const MUSIC_INTRO_S = 5;
export const MUSIC_OUTRO_S = 6;
export const SEGMENT_GAP_S = 2.5;
/** 매장 방송 말 빠르기: 공백 뺀 글자 기준 초당 약 5.5자 */
const CHARS_PER_SECOND = 5.5;

/** 목표 길이에 맞는 멘트 분량 (공백 뺀 글자 수) */
export function scriptBudget(seconds: number) {
  const segments = Math.max(3, Math.min(10, Math.round(seconds / 20)));
  const speech = seconds - MUSIC_INTRO_S - MUSIC_OUTRO_S - SEGMENT_GAP_S * (segments - 1);
  return { segments, chars: Math.round(speech * CHARS_PER_SECOND) };
}

export interface BroadcastSegment { text: string }

export interface BroadcastScript {
  title: string;
  theme: Exclude<BroadcastTheme, '자동'>;
  /** TTS 말투 지시 */
  tone: string;
  voice: string;
  /** 배경음악 설명 (영어, 음악 생성 AI용) */
  music: string;
  segments: BroadcastSegment[];
}

export interface BroadcastScriptRequest {
  items: FlyerItem[];
  seconds: number;
  theme: BroadcastTheme;
  voice: string;
  /** 매장 이름 등 덧붙일 말 (선택) */
  note?: string;
}

/** TTS 응답: 24kHz 16비트 모노 PCM (base64) */
export interface BroadcastSpeech { audio: string; sampleRate: number }
/** 배경음악 응답: mp3·wav (base64) */
export interface BroadcastMusic { audio: string; mimeType: string }
