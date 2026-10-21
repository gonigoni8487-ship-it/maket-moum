// 매장 방송 합치기 (기기에서): 음성 단락들 + 배경음악 → 목소리가 항상 앞에 오도록 음악을 낮게 깔고 하나의 파일(WAV·MP3)로
import { MUSIC_INTRO_S, MUSIC_OUTRO_S, SEGMENT_GAP_S } from './broadcast';

const OUT_RATE = 32000; // 매장 스피커용 모노 32kHz
const MAX_GAP_S = 6; // 멘트가 목표보다 짧을 때 단락 사이를 이만큼까지 늘린다
const VOICE_RMS = 0.2; // 단락마다 목소리 크기를 맞춘다
// 배경음악 크기 (목소리 크기 대비): 멘트 중에는 -20dB, 음악만 나올 때도 -9dB — 음악이 목소리보다 커지는 순간이 없게
const MUSIC_UNDER_VOICE = 0.1;
const MUSIC_ALONE = 0.35;
const CROSSFADE_S = 2;
const MP3_KBPS = 96;

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

/** 한 단락을 나눠 만든 음성 조각들을 짧은 숨 쉬는 틈을 두고 하나로 잇는다 */
export function joinBuffers(parts: AudioBuffer[], gapS = 0.25): AudioBuffer {
  if (parts.length === 1) return parts[0];
  const rate = parts[0].sampleRate;
  const gap = Math.round(gapS * rate);
  const out = new AudioBuffer({ length: parts.reduce((n, b) => n + b.length, 0) + gap * (parts.length - 1), numberOfChannels: 1, sampleRate: rate });
  const ch = out.getChannelData(0);
  let at = 0;
  for (const b of parts) { ch.set(b.getChannelData(0), at); at += b.length + gap; }
  return out;
}

/** mp3·wav 배경음악 → AudioBuffer */
export function decodeMusic(b64: string): Promise<AudioBuffer> {
  const bytes = base64ToBytes(b64);
  return new OfflineAudioContext(1, 1, OUT_RATE).decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
}

/** 직접 고른 음악 파일(mp3·wav·m4a) → AudioBuffer (기기 안에서만 쓰고 서버로 보내지 않는다) */
export async function decodeMusicFile(file: File): Promise<AudioBuffer> {
  return new OfflineAudioContext(1, 1, OUT_RATE).decodeAudioData(await file.arrayBuffer());
}

/** 소리가 나는 부분의 평균 크기(RMS)와 최대값 (조용한 구간은 빼고 잰다) */
function loudness(buf: AudioBuffer) {
  let sum = 0, count = 0, peak = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < ch.length; i++) {
      const a = Math.abs(ch[i]);
      if (a > peak) peak = a;
      if (a > 0.01) { sum += ch[i] * ch[i]; count++; }
    }
  }
  return { rms: count ? Math.sqrt(sum / count) : 0, peak };
}

/** 단락마다 시작 시각 (배경음악이 있고 목표 길이에 모자라면 음악이 나오는 쉼을 늘린다) */
export function plan(voices: AudioBuffer[], targetSeconds: number, withMusic = true) {
  const speech = voices.reduce((s, v) => s + v.duration, 0);
  const gaps = Math.max(0, voices.length - 1);
  const base = MUSIC_INTRO_S + speech + SEGMENT_GAP_S * gaps + MUSIC_OUTRO_S;
  const gap = withMusic && gaps && base < targetSeconds ? Math.min(MAX_GAP_S, SEGMENT_GAP_S + (targetSeconds - base) / gaps) : SEGMENT_GAP_S;
  const starts: number[] = [];
  let t = withMusic ? MUSIC_INTRO_S : 0.5;
  for (const v of voices) { starts.push(t); t += v.duration + gap; }
  const total = (voices.length ? t - gap : MUSIC_INTRO_S) + (withMusic ? MUSIC_OUTRO_S : 0.8);
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
    const { rms } = loudness(music);
    const scale = rms ? VOICE_RMS / rms : 1;
    const alone = MUSIC_ALONE * scale, under = MUSIC_UNDER_VOICE * scale;
    // 음악 크기: 페이드인 → 멘트마다 낮췄다가 쉼에서 조금 올림 → 끝 페이드아웃
    const bed = ctx.createGain();
    const g = bed.gain;
    g.setValueAtTime(0, 0);
    g.linearRampToValueAtTime(alone, 1);
    voices.forEach((v, i) => {
      const s = starts[i];
      g.setValueAtTime(alone, Math.max(1, s - 0.7));
      g.linearRampToValueAtTime(under, s - 0.1);
      g.setValueAtTime(under, s + v.duration + 0.15);
      g.linearRampToValueAtTime(alone, s + v.duration + 1);
    });
    g.setValueAtTime(alone, Math.max(0, total - 3.5));
    g.linearRampToValueAtTime(0, total);
    // 목소리가 있는 대역(2~3kHz)을 음악에서 비워 둔다
    const carve = ctx.createBiquadFilter();
    carve.type = 'peaking';
    carve.frequency.value = 2500;
    carve.Q.value = 0.8;
    carve.gain.value = -6;
    bed.connect(carve).connect(limiter);

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
    const { rms, peak } = loudness(v);
    const level = ctx.createGain();
    level.gain.value = rms ? Math.min(VOICE_RMS / rms, 0.95 / Math.max(peak, 1e-3)) : 1;
    const src = ctx.createBufferSource();
    src.buffer = v;
    src.connect(level).connect(limiter);
    src.start(starts[i]);
  });
  return ctx.startRendering();
}

const toInt16 = (ch: Float32Array) => {
  const out = new Int16Array(ch.length);
  for (let i = 0; i < ch.length; i++) out[i] = Math.max(-1, Math.min(1, ch[i])) * 0x7fff;
  return out;
};

/** AudioBuffer → 16비트 WAV 파일 (방송 PC용 원음) */
export function toWav(buf: AudioBuffer): Blob {
  const pcm = toInt16(buf.getChannelData(0));
  const out = new DataView(new ArrayBuffer(44));
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + pcm.byteLength, true); str(8, 'WAVE');
  str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  str(36, 'data'); out.setUint32(40, pcm.byteLength, true);
  return new Blob([out, pcm], { type: 'audio/wav' });
}

/** AudioBuffer → MP3 파일 (휴대폰·카톡으로 주고받기 좋은 크기, 3분 ≈ 2MB) */
export async function toMp3(buf: AudioBuffer): Promise<Blob> {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const enc = new Mp3Encoder(1, buf.sampleRate, MP3_KBPS);
  const pcm = toInt16(buf.getChannelData(0));
  const parts: Uint8Array[] = [];
  const CHUNK = 1152 * 20;
  for (let i = 0; i < pcm.length; i += CHUNK) {
    const out = enc.encodeBuffer(pcm.subarray(i, i + CHUNK));
    if (out.length) parts.push(out.slice());
  }
  const end = enc.flush();
  if (end.length) parts.push(end.slice());
  return new Blob(parts as BlobPart[], { type: 'audio/mpeg' });
}
