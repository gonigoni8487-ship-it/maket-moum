import { speech } from './shared';

// 강력 알림: 알림음·호출음·사이렌, 진동, 시스템 알림, 음성 호출

export interface AlertPrefs {
  sound: boolean;
  vibrate: boolean;
  /** 받은 요청을 "수산 담당님 호출입니다"처럼 말로 알림 */
  call: boolean;
  /** 모든 알림 내용을 읽어 줌 (베타) */
  voice: boolean;
  /** 긴급 경보음 종류 */
  alarm: AlarmTone;
}

const PREFS_KEY = 'marton-alert-prefs';
export const defaultPrefs: AlertPrefs = { sound: true, vibrate: true, call: true, voice: false, alarm: 'digital' };

export function loadPrefs(): AlertPrefs {
  try { return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { return defaultPrefs; }
}
export function savePrefs(p: AlertPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* 무시 */ }
}

let pushActive = false;

/** 웹 푸시가 켜져 있으면 시스템 알림은 서버 푸시가 담당한다 (중복 방지) */
export function setPushActive(v: boolean) {
  pushActive = v;
}
let vibrateTimer: number | null = null;

// ---- 알림음 ----
// Web Audio는 아이폰 무음 스위치에 꺼지고 앱을 다시 열면 잠기기 쉬워서, 실제 오디오 재생(<audio>)으로 낸다.
// 소리 파일은 내려받지 않고 기기에서 바로 만든다 (WAV).

function wavUrl(seconds: number, sample: (t: number) => number) {
  const rate = 22050;
  const n = Math.floor(seconds * rate);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample(i / rate))) * 32767, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

// 긴급 경보음 (확인할 때까지 반복). 구급차처럼 높낮이가 오가는 사이렌 대신 업무용 알람 소리 3가지 중에서 고른다.
export type AlarmTone = 'digital' | 'bell' | 'chime';
export const ALARM_TONES: { id: AlarmTone; label: string; hint: string }[] = [
  { id: 'digital', label: '디지털 알람', hint: '삐삐삐삐— 알람시계처럼' },
  { id: 'bell', label: '전자 벨', hint: '따르르릉 울리는 벨' },
  { id: 'chime', label: '업무 차임', hint: '띵동 띵동 반복' },
];
const env = (t: number, a: number, b: number, fadeIn = 0.005, fadeOut = 0.01) => Math.max(0, Math.min(1, (t - a) / fadeIn, (b - t) / fadeOut));
const ALARM_SAMPLES: Record<AlarmTone, (t: number) => number> = {
  // 2초에 "삐삐삐삐" 두 번: 짧고 또렷한 단음 (알람시계·업무용 단말기 소리)
  digital: t => {
    const g = t % 1;
    const i = Math.floor(g / 0.12);
    if (i > 3) return 0;
    const a = i * 0.12, b = a + 0.075;
    if (g > b) return 0;
    const f = 2093; // 높은 도
    return (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 3 * t)) * env(g, a, b) * 0.5;
  },
  // 따르르릉: 벨이 빠르게 떨리는 소리 0.9초 + 쉼
  bell: t => {
    const g = t % 1;
    if (g > 0.9) return 0;
    const trem = 0.55 + 0.45 * Math.sign(Math.sin(2 * Math.PI * 22 * t)); // 망치가 때리는 떨림
    const x = Math.sin(2 * Math.PI * 1318 * t) + 0.6 * Math.sin(2 * Math.PI * 1760 * t) + 0.25 * Math.sin(2 * Math.PI * 2637 * t);
    return x * trem * env(g, 0, 0.9, 0.01, 0.08) * 0.32;
  },
  // 띵동 띵동: 맑은 실로폰 두 음을 반복
  chime: t => {
    const notes: [number, number][] = [[0, 1319], [0.3, 1047], [1.0, 1319], [1.3, 1047]];
    let v = 0;
    for (const [start, f] of notes) {
      if (t < start) continue;
      const l = t - start;
      v += (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 4 * t)) * Math.exp(-l * 4.5) * 0.45;
    }
    return v;
  },
};
let alarmTone: AlarmTone = 'digital';
// 일반 알림: 딩-동
const chimeSample = (t: number) => {
  const f = t < 0.2 ? 880 : 1320;
  const local = t < 0.2 ? t : t - 0.2;
  return Math.sin(2 * Math.PI * f * t) * Math.exp(-local * 9) * 0.8;
};

// 호출음: 매장 안내방송처럼 "띵-동-댕-동" 올라가는 4음 (받은 요청, 약 1.6초)
const CALL_NOTES = [523.25, 659.25, 783.99, 1046.5]; // 도 미 솔 (높은)도
const callSample = (t: number) => {
  const i = Math.min(Math.floor(t / 0.3), CALL_NOTES.length - 1);
  const local = t - i * 0.3;
  const f = CALL_NOTES[i];
  const decay = Math.exp(-local * (i === CALL_NOTES.length - 1 ? 2.2 : 4));
  // 배음을 섞어 차임벨처럼 또렷하게
  return (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2 * t) + 0.15 * Math.sin(2 * Math.PI * f * 3 * t)) * decay * 0.62;
};
const CALL_SECONDS = 1.6;

// 소통 커피쿠폰 도착음: "띠리리링~" 빠르게 올라가는 맑은 벨소리 + 반짝이는 끝음 (약 1.4초)
const COUPON_NOTES = [784, 988, 1175, 1568, 1976]; // 솔 시 레 솔 시
const couponSample = (t: number) => {
  let v = 0;
  COUPON_NOTES.forEach((f, i) => {
    const start = i * 0.09;
    if (t < start) return;
    const local = t - start;
    const decay = Math.exp(-local * (i === COUPON_NOTES.length - 1 ? 2.5 : 5));
    v += (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 3 * t)) * decay * 0.28;
  });
  return v;
};
const COUPON_SECONDS = 1.4;

let siren: HTMLAudioElement | null = null;
let chime: HTMLAudioElement | null = null;
let call: HTMLAudioElement | null = null;
let coupon: HTMLAudioElement | null = null;
let unlocked = false;
const soundListeners = new Set<(ok: boolean) => void>();

function players() {
  if (!siren) {
    siren = new Audio(wavUrl(2, ALARM_SAMPLES[alarmTone]));
    siren.loop = true;
    chime = new Audio(wavUrl(0.6, chimeSample));
    call = new Audio(wavUrl(CALL_SECONDS, callSample));
    coupon = new Audio(wavUrl(COUPON_SECONDS, couponSample));
  }
  return { siren, chime: chime!, call: call!, coupon: coupon! };
}

/** 긴급 경보음 바꾸기 (설정에서 고를 때 · 앱 시작 때) */
export function setAlarmTone(tone: AlarmTone) {
  if (!ALARM_SAMPLES[tone] || tone === alarmTone) return;
  alarmTone = tone;
  if (siren) {
    const playing = !siren.paused;
    siren.pause();
    siren.src = wavUrl(2, ALARM_SAMPLES[tone]);
    if (playing) void siren.play().catch(() => {});
  }
}

function setUnlocked(ok: boolean) {
  if (unlocked === ok) return;
  unlocked = ok;
  soundListeners.forEach(l => l(ok));
}

/** 소리를 낼 수 있는 상태인지 (화면을 한 번 누르기 전에는 브라우저가 막는다) */
export const soundReady = () => unlocked;
export function onSoundReady(l: (ok: boolean) => void) {
  soundListeners.add(l);
  return () => { soundListeners.delete(l); };
}

/** 화면을 누를 때마다 호출: 그 순간에 한 번 재생해 두면 이후 알림 소리가 막히지 않는다 */
export function unlockAudio() {
  try {
    // 아이폰: 무음 스위치가 켜져 있어도 재생되도록 (Safari 17+)
    const session = (navigator as any).audioSession;
    if (session && session.type !== 'playback') session.type = 'playback';
  } catch { /* 지원 안 함 */ }
  primeSpeech(); // 음성 안내도 첫 터치 때 깨워 둔다 (아이폰·일부 안드로이드)
  if (unlocked) return;
  try {
    const { siren: s, chime: c, call: cl, coupon: cp } = players();
    for (const el of [c, cl, cp, s]) {
      el.muted = true;
      void el.play().then(() => {
        if (el === s && !alarmOn) { el.pause(); el.currentTime = 0; }
        if (el !== s) { el.pause(); el.currentTime = 0; }
        el.muted = false;
        setUnlocked(true);
      }).catch(() => { el.muted = false; });
    }
  } catch { /* 오디오 미지원 */ }
}

let alarmOn = false;

/** 사이렌을 켠다. 브라우저가 막으면 false (화면을 눌러 다시 켜야 함) */
export async function startSiren(): Promise<boolean> {
  alarmOn = true;
  const { siren: s } = players();
  s.muted = false;
  s.currentTime = 0;
  try {
    await s.play();
    setUnlocked(true);
    return true;
  } catch {
    setUnlocked(false);
    return false;
  }
}

async function playChime(tone: 'chime' | 'call' | 'coupon' = 'chime') {
  const { chime, call: cl, coupon: cp } = players();
  const c = tone === 'call' ? cl : tone === 'coupon' ? cp : chime;
  c.currentTime = 0;
  try { await c.play(); setUnlocked(true); } catch { setUnlocked(false); }
}

// 생일 축하: 빵빠레 디지털 팡파레 (8비트 게임기 소리, 약 4초)
// [시작 시각(초), 길이(초), 음 높이(반음, 도5=0)] — 멜로디는 각진 사각파, 아래에 베이스·북소리를 깐다
const FANFARE: [number, number, number][] = [
  [0.00, 0.09, -5], [0.10, 0.09, 0], [0.20, 0.09, 4], [0.30, 0.34, 7], // 빠바바밤—
  [0.70, 0.09, 4], [0.80, 0.45, 7], // 빠밤—
  [1.40, 0.14, 9], [1.60, 0.14, 9], [1.80, 0.14, 11], // 빠! 빠! 빠!
  [2.00, 1.10, 12], // 빠아아~
  [3.20, 0.80, 12], [3.20, 0.80, 16], [3.20, 0.80, 19], // 밤! (화음)
];
const FANFARE_BASS: [number, number, number][] = [[0, 0.6, -24], [0.7, 0.6, -17], [1.4, 0.5, -15], [2.0, 1.1, -12], [3.2, 0.8, -24]];
const FANFARE_DRUM = [0, 0.7, 1.4, 1.6, 1.8, 2.0, 3.2];
const square = (f: number, t: number, duty = 0.25) => ((f * t) % 1 < duty ? 1 : -1);
const BDAY_SECONDS = 4.3;
const bdaySample = (t: number) => {
  let v = 0;
  for (const [a, len, semi] of FANFARE) {
    if (t < a || t > a + len + 0.05) continue;
    const l = t - a;
    const vib = l > 0.4 ? 1 + 0.006 * Math.sin(2 * Math.PI * 6 * l) : 1; // 긴 음은 살짝 떨림
    const e = Math.min(1, l / 0.008) * (t > a + len ? Math.max(0, 1 - (t - a - len) / 0.05) : 1) * (len > 0.5 ? Math.exp(-l * 0.8) : 1);
    v += square(523.25 * 2 ** (semi / 12) * vib, t) * e * 0.12;
  }
  for (const [a, len, semi] of FANFARE_BASS) {
    if (t < a || t > a + len) continue;
    const f = 523.25 * 2 ** (semi / 12);
    v += (Math.abs(((f * t) % 1) * 4 - 2) - 1) * Math.min(1, (a + len - t) / 0.03) * 0.22; // 삼각파 베이스
  }
  for (const d of FANFARE_DRUM) {
    const l = t - d;
    if (l >= 0 && l < 0.08) v += (Math.random() * 2 - 1) * Math.exp(-l * 60) * 0.25; // 짧은 북소리
  }
  return Math.max(-1, Math.min(1, v));
};
let bday: HTMLAudioElement | null = null;

/** 생일 축하: 빵빠레 팡파레가 끝나면 "OO 담당님 생일 축하드립니다"를 읽어 준다. 소리가 막히면 false */
export async function celebrateBirthday(message: string): Promise<boolean> {
  bday ??= new Audio(wavUrl(BDAY_SECONDS, bdaySample));
  bday.currentTime = 0;
  try {
    await bday.play();
    window.setTimeout(() => speak(message), BDAY_SECONDS * 1000);
    return true;
  } catch {
    speak(message);
    return false;
  }
}

/** 음성으로 읽기. 숫자·단위는 한글 발음으로 바꿔 읽는다 (4,990원 → 사천구백구십원) */
// ---- 음성 안내 ----
// 한국어 음성을 직접 골라 쓰고(기본 음성이 영어면 아무 소리도 안 나는 기기가 있다),
// 화면을 누를 때 음성 엔진을 미리 깨워 둔다(누른 뒤 한참 지나 말하면 막는 휴대폰이 있다).
let koVoice: SpeechSynthesisVoice | null = null;
let speechPrimed = false;
const voiceListeners = new Set<() => void>();
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  koVoice = voices.find(v => /^ko[-_]KR/i.test(v.lang) && v.localService) ?? voices.find(v => /^ko/i.test(v.lang)) ?? null;
  voiceListeners.forEach(l => l());
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

/** 음성 안내 상태: 'ok' 한국어 음성 있음 / 'no-korean' 한국어 음성 없음 / 'unsupported' 음성 기능 없음 */
export function voiceStatus(): 'ok' | 'no-korean' | 'unsupported' {
  if (!('speechSynthesis' in window)) return 'unsupported';
  if (koVoice) return 'ok';
  return speechSynthesis.getVoices().length ? 'no-korean' : 'ok'; // 목록을 아직 못 받았으면 일단 ok
}
export function onVoiceChange(l: () => void) { voiceListeners.add(l); return () => { voiceListeners.delete(l); }; }

/** 화면을 누를 때 호출: 소리 없는 짧은 음성으로 엔진을 깨운다 */
export function primeSpeech() {
  if (speechPrimed || !('speechSynthesis' in window)) return;
  speechPrimed = true;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  if (koVoice) u.voice = koVoice;
  speechSynthesis.speak(u);
}

export function speak(message: string) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(speech(message));
  u.lang = 'ko-KR';
  if (koVoice) u.voice = koVoice;
  u.rate = 1.05;
  u.volume = 1;
  if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
  speechSynthesis.resume(); // 크롬에서 엔진이 멈춰 있는 경우
  speechSynthesis.speak(u);
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported' as const;
  if (Notification.permission === 'default') return Notification.requestPermission();
  return Notification.permission;
}

async function systemNotify(title: string, body: string, urgent: boolean, tag: string) {
  if (pushActive || !('Notification' in window) || Notification.permission !== 'granted') return;
  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body, tag, icon: '/marton/icon-192.png', badge: '/marton/badge-96.png',
    requireInteraction: urgent, renotify: true, vibrate: urgent ? [400, 150, 400, 150, 400] : [200],
  };
  // 모바일에서는 서비스워커 알림만 동작한다.
  const reg = await navigator.serviceWorker?.getRegistration('/marton/');
  if (reg) await reg.showNotification(title, options);
  else new Notification(title, options);
}

/**
 * 새 업무/공지 알림. 긴급이면 확인(stopAlarm)할 때까지 사이렌(반복)과 진동이 계속된다.
 * 돌려주는 값: 소리가 실제로 났는지 (막혔으면 화면에 "눌러서 사이렌 켜기"를 보여준다)
 */
export async function alert(opts: {
  title: string; body: string; urgent: boolean; tag: string; prefs: AlertPrefs;
  /** call: 받은 요청 호출음 (긴급이면 무시하고 사이렌) */
  tone?: 'chime' | 'call' | 'coupon';
  /** 호출 음성 (예: "수산 담당님 호출입니다") */
  announce?: string;
}): Promise<boolean> {
  const { title, body, urgent, tag, prefs, tone, announce } = opts;
  void systemNotify(title, body, urgent, tag);
  const spoken = announce && prefs.call ? announce : prefs.voice ? `${urgent ? '긴급 요청. ' : ''}${title}. ${body}` : null;
  // 호출음이 끝난 뒤 말한다 (사이렌은 계속 울리므로 바로)
  if (spoken) window.setTimeout(() => speak(spoken), prefs.sound && !urgent && tone === 'call' ? CALL_SECONDS * 1000 : prefs.sound && tone === 'coupon' ? COUPON_SECONDS * 1000 : 0);

  const pattern = urgent ? [500, 200, 500, 200, 500] : tone === 'call' ? [250, 100, 250, 100, 250, 100, 600] : tone === 'coupon' ? [80, 60, 80, 60, 300] : [200, 100, 200];
  const vibrate = () => { if (prefs.vibrate) navigator.vibrate?.(pattern); };
  vibrate();
  if (urgent) {
    stopAlarm();
    vibrateTimer = window.setInterval(vibrate, 4000);
  }
  if (!prefs.sound) return true;
  if (urgent) return startSiren();
  await playChime(tone);
  return unlocked;
}

/** 받은 요청의 호출 음성 */
export const callPhrase = (dept: string, category: string, location?: string, urgent?: boolean) =>
  `${urgent ? '긴급 호출. ' : ''}${dept} 담당님 호출입니다. ${category}${location ? `, ${location}` : ''}`;

export function stopAlarm() {
  alarmOn = false;
  if (vibrateTimer !== null) clearInterval(vibrateTimer);
  vibrateTimer = null;
  navigator.vibrate?.(0);
  if (siren) { siren.pause(); siren.currentTime = 0; }
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/marton/sw.js', { scope: '/marton/' }).catch(() => { /* 개발환경 등 */ });
  }
}
