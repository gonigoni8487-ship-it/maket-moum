// 강력 알림: 알림음(WebAudio), 진동, 시스템 알림, 음성 안내

export interface AlertPrefs {
  sound: boolean;
  vibrate: boolean;
  voice: boolean;
}

const PREFS_KEY = 'marton-alert-prefs';
export const defaultPrefs: AlertPrefs = { sound: true, vibrate: true, voice: false };

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

// 경보음: 삐삐삐 — 삐삐삐 (바코드 훼손·가격 오류처럼 계산대가 멈추는 요청, 약 2.4초)
const beepSample = (t: number) => {
  const inGroup = t % 1.2;
  const on = inGroup < 0.75 && inGroup % 0.25 < 0.17;
  if (!on) return 0;
  return Math.tanh(Math.sin(2 * Math.PI * 1500 * t) * 3) * 0.95;
};

let siren: HTMLAudioElement | null = null;
let chime: HTMLAudioElement | null = null;
let beep: HTMLAudioElement | null = null;
let unlocked = false;
const soundListeners = new Set<(ok: boolean) => void>();

function players() {
  if (!siren) {
    siren = new Audio(wavUrl(2, sirenSample));
    siren.loop = true;
    chime = new Audio(wavUrl(0.6, chimeSample));
    beep = new Audio(wavUrl(2.4, beepSample));
  }
  return { siren, chime: chime!, beep: beep! };
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
    const { siren: s, chime: c, beep: bp } = players();
    for (const el of [c, bp, s]) {
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

async function playChime(tone: 'chime' | 'alarm' = 'chime') {
  const { chime, beep: bp } = players();
  const c = tone === 'alarm' ? bp : chime;
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
export async function alert(opts: { title: string; body: string; urgent: boolean; tag: string; prefs: AlertPrefs; tone?: 'chime' | 'alarm' }): Promise<boolean> {
  const { title, body, urgent, tag, prefs, tone } = opts;
  void systemNotify(title, body, urgent, tag);
  if (prefs.voice) speak(`${urgent ? '긴급 요청. ' : ''}${title}. ${body}`);

  const pattern = urgent ? [500, 200, 500, 200, 500] : tone === 'alarm' ? [300, 100, 300, 100, 300, 400, 300, 100, 300, 100, 300] : [200, 100, 200];
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

/** 바코드 훼손·가격 오류 요청은 일반 알림보다 강한 경보음으로 알린다 */
export const ALARM_CATEGORIES: readonly string[] = ['바코드 훼손/미인식', '가격 오류'];

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
