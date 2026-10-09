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

// 사이렌: 1000Hz ↔ 700Hz를 0.25초마다 오가는 큰 경보음 (반복 재생)
const sirenSample = (t: number) => {
  const f = Math.floor(t / 0.25) % 2 ? 700 : 1000;
  const x = Math.sin(2 * Math.PI * f * t);
  return Math.tanh(x * 3) * 0.95; // 각진 파형으로 작은 스피커에서도 잘 들리게
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

let siren: HTMLAudioElement | null = null;
let chime: HTMLAudioElement | null = null;
let call: HTMLAudioElement | null = null;
let unlocked = false;
const soundListeners = new Set<(ok: boolean) => void>();

function players() {
  if (!siren) {
    siren = new Audio(wavUrl(2, sirenSample));
    siren.loop = true;
    chime = new Audio(wavUrl(0.6, chimeSample));
    call = new Audio(wavUrl(CALL_SECONDS, callSample));
  }
  return { siren, chime: chime!, call: call! };
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
    const { siren: s, chime: c, call: cl } = players();
    for (const el of [c, cl, s]) {
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

async function playChime(tone: 'chime' | 'call' = 'chime') {
  const { chime, call: cl } = players();
  const c = tone === 'call' ? cl : chime;
  c.currentTime = 0;
  try { await c.play(); setUnlocked(true); } catch { setUnlocked(false); }
}

export function speak(message: string) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(message);
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
  tone?: 'chime' | 'call';
  /** 호출 음성 (예: "수산 담당님 호출입니다") */
  announce?: string;
}): Promise<boolean> {
  const { title, body, urgent, tag, prefs, tone, announce } = opts;
  void systemNotify(title, body, urgent, tag);
  const spoken = announce && prefs.call ? announce : prefs.voice ? `${urgent ? '긴급 요청. ' : ''}${title}. ${body}` : null;
  // 호출음이 끝난 뒤 말한다 (사이렌은 계속 울리므로 바로)
  if (spoken) window.setTimeout(() => speak(spoken), prefs.sound && !urgent && tone === 'call' ? CALL_SECONDS * 1000 : 0);

  const pattern = urgent ? [500, 200, 500, 200, 500] : tone === 'call' ? [250, 100, 250, 100, 250, 100, 600] : [200, 100, 200];
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
