// 매장 방송 합치기 (기기에서): 음성 단락들 + 배경음악 → 멘트가 나올 때 음악을 줄이고(더킹) 하나의 WAV 파일로
import { MUSIC_INTRO_S, MUSIC_OUTRO_S, SEGMENT_GAP_S } from './broadcast';

const OUT_RATE = 32000; // 매장 스피커용 모노 32kHz (3분 ≈ 11MB)
const MAX_GAP_S = 7; // 멘트가 목표보다 짧을 때 단락 사이를 이만큼까지 늘린다
const MUSIC_FULL = 0.75;
const MUSIC_DUCK = 0.16;
const CROSSFADE_S = 2;

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Gemini TTS 결과(16비트 리틀엔디언 PCM) → AudioBuffer */
export function pcmToBuffer(b64: string, sampleRate: number): AudioBuffer {
  const bytes = base64ToBytes(b64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = Math.floor(bytes.byteLength / 2);
  const buf = new AudioBuffer({ length: Math.max(1, n), numberOfChannels: 1, sampleRate });
  const ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = view.getInt16(i * 2, true) / 32768;
  return buf;
}

/** mp3·wav 배경음악 → AudioBuffer */
export function decodeMusic(b64: string): Promise<AudioBuffer> {
  const bytes = base64ToBytes(b64);
  return new OfflineAudioContext(1, 1, OUT_RATE).decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
}

/** 단락마다 시작 시각 (배경음악이 있고 목표 길이에 모자라면 음악이 나오는 쉼을 늘린다) */
export function plan(voices: AudioBuffer[], targetSeconds: number, withMusic = true) {
  const speech = voices.reduce((s, v) => s + v.duration, 0);
  const gaps = Math.max(0, voices.length - 1);
  const base = MUSIC_INTRO_S + speech + SEGMENT_GAP_S * gaps + MUSIC_OUTRO_S;
  const gap = withMusic && gaps && base < targetSeconds ? Math.min(MAX_GAP_S, SEGMENT_GAP_S + (targetSeconds - base) / gaps) : SEGMENT_GAP_S;
  const starts: number[] = [];
  let t = MUSIC_INTRO_S;
  for (const v of voices) { starts.push(t); t += v.duration + gap; }
  const total = (voices.length ? t - gap : MUSIC_INTRO_S) + MUSIC_OUTRO_S;
  return { starts, total };
}

export async function mixBroadcast(voices: AudioBuffer[], music: AudioBuffer | null, targetSeconds: number): Promise<AudioBuffer> {
  const { starts, total } = plan(voices, targetSeconds, Boolean(music));
  const ctx = new OfflineAudioContext(1, Math.ceil(total * OUT_RATE), OUT_RATE);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.ratio.value = 12;
  limiter.connect(ctx.destination);

  if (music) {
    // 음악 크기: 시작 페이드인 → 멘트마다 줄였다가 쉼에서 다시 → 끝 페이드아웃
    const bed = ctx.createGain();
    const g = bed.gain;
    g.setValueAtTime(0, 0);
    g.linearRampToValueAtTime(MUSIC_FULL, 0.8);
    voices.forEach((v, i) => {
      const s = starts[i];
      g.setValueAtTime(MUSIC_FULL, Math.max(0.8, s - 0.6));
      g.linearRampToValueAtTime(MUSIC_DUCK, s - 0.1);
      g.setValueAtTime(MUSIC_DUCK, s + v.duration + 0.1);
      g.linearRampToValueAtTime(MUSIC_FULL * 0.85, s + v.duration + 0.9);
    });
    g.setValueAtTime(MUSIC_FULL * 0.85, Math.max(0, total - 3.5));
    g.linearRampToValueAtTime(0, total);
    bed.connect(limiter);

    // 음악이 방송보다 짧으면 겹쳐 이어 붙인다 (이음새는 2초 크로스페이드)
    const step = Math.max(1, music.duration - CROSSFADE_S);
    for (let at = 0, k = 0; at < total; at += step, k++) {
      const src = ctx.createBufferSource();
      src.buffer = music;
      const fade = ctx.createGain();
      if (k > 0) { fade.gain.setValueAtTime(0, at); fade.gain.linearRampToValueAtTime(1, at + CROSSFADE_S); }
      if (at + music.duration < total) { fade.gain.setValueAtTime(1, at + music.duration - CROSSFADE_S); fade.gain.linearRampToValueAtTime(0, at + music.duration); }
      src.connect(fade).connect(bed);
      src.start(at);
    }
  }

  voices.forEach((v, i) => {
    const src = ctx.createBufferSource();
    src.buffer = v;
    src.connect(limiter);
    src.start(starts[i]);
  });
  return ctx.startRendering();
}

/** AudioBuffer → 16비트 WAV 파일 */
export function toWav(buf: AudioBuffer): Blob {
  const ch = buf.getChannelData(0);
  const out = new DataView(new ArrayBuffer(44 + ch.length * 2));
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + ch.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  str(36, 'data'); out.setUint32(40, ch.length * 2, true);
  for (let i = 0; i < ch.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, ch[i])) * 0x7fff, true);
  return new Blob([out], { type: 'audio/wav' });
}
