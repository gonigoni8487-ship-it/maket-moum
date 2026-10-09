import { speech } from './shared';

// 강력 알림: 알림음·호출음·사이렌, 진동, 시스템 알림, 음성 호출

export interface AlertPrefs {
  sound: boolean;
  vibrate: boolean;
  /** 받은 요청을 "수산 담당님 호출입니다"처럼 말로 알림 */
  call: boolean;
  /** 모든 알림 내용을 읽어 줌 (베타) */
  voice: boolean;
}

const PREFS_KEY = 'marton-alert-prefs';
export const defaultPrefs: AlertPrefs = { sound: true, vibrate: true, call: true, voice: false };

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

// 긴급 경보음: "띠-리- 띠-리-" 두 음을 부드럽게 오가는 소리 (반복 재생).
// 예전 각진 사이렌(1000/700Hz)이 너무 시끄러워, 둥근 음색과 짧은 쉼을 넣어 귀가 덜 피곤하게 했다.
const ALARM_NOTES = [[0, 0.32, 988], [0.4, 0.72, 740], [1.0, 1.32, 988], [1.4, 1.72, 740]] as const; // 2초 한 바퀴
const sirenSample = (t: number) => {
  const note = ALARM_NOTES.find(([a, b]) => t >= a && t < b);
  if (!note) return 0;
  const [a, b, f] = note;
  const env = Math.min(1, (t - a) / 0.03, (b - t) / 0.06); // 부드럽게 시작·끝
  const x = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * t);
  return x * env * 0.6;
};
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
    siren = new Audio(wavUrl(2, sirenSample));
    siren.loop = true;
    chime = new Audio(wavUrl(0.6, chimeSample));
    call = new Audio(wavUrl(CALL_SECONDS, callSample));
    coupon = new Audio(wavUrl(COUPON_SECONDS, couponSample));
  }
  return { siren, chime: chime!, call: call!, coupon: coupon! };
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
  if (unlocked) return;
  try {
    // 음성 안내도 첫 터치 때 한 번 열어 둔다 (아이폰)
    if ('speechSynthesis' in window && !unlocked) speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(' '), { volume: 0 }));
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

// 생일 축하 멜로디: "생일 축하합니다" 한 소절 (오르골 소리, 약 7초)
const BDAY: [number, number][] = [ // [음 높이(반음, 도=0), 박자]
  [-5, .75], [-5, .25], [-3, 1], [-5, 1], [0, 1], [-1, 2],
  [-5, .75], [-5, .25], [-3, 1], [-5, 1], [2, 1], [0, 2],
  [-5, .75], [-5, .25], [7, 1], [4, 1], [0, 1], [-1, 1], [-3, 2],
  [5, .75], [5, .25], [4, 1], [0, 1], [2, 1], [0, 2],
];
const BEAT = 0.36;
const BDAY_SECONDS = BDAY.reduce((t, [, b]) => t + b, 0) * BEAT + 0.6;
const bdaySample = (t: number) => {
  let start = 0;
  for (const [semi, beats] of BDAY) {
    const len = beats * BEAT;
    if (t < start + len + 0.4 && t >= start) {
      const f = 523.25 * 2 ** (semi / 12);
      const l = t - start;
      return (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(4 * Math.PI * f * t) + 0.15 * Math.sin(6 * Math.PI * f * t)) * Math.exp(-l * 3) * 0.45;
    }
    start += len;
  }
  return 0;
};
let bday: HTMLAudioElement | null = null;

/** 생일 축하: 멜로디가 끝나면 "OO 담당님 생일 축하드립니다"를 읽어 준다. 소리가 막히면 false */
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
export function speak(message: string) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(speech(message));
  u.lang = 'ko-KR';
  u.rate = 1.05;
  speechSynthesis.cancel();
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
