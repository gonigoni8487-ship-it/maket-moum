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

let ctx: AudioContext | null = null;
let pushActive = false;

/** 웹 푸시가 켜져 있으면 시스템 알림은 서버 푸시가 담당한다 (중복 방지) */
export function setPushActive(v: boolean) {
  pushActive = v;
}
let alarmTimer: number | null = null;

/** 모바일 브라우저는 사용자 터치 이후에만 소리를 낼 수 있어서, 로그인 버튼 등에서 미리 호출한다. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* 오디오 미지원 */ }
}

function tone(freq: number, start: number, duration: number, volume = 0.3) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration);
}

function chime() {
  tone(880, 0, 0.18);
  tone(1320, 0.2, 0.25);
}

function siren() {
  for (let i = 0; i < 4; i++) {
    tone(1000, i * 0.5, 0.24, 0.45);
    tone(700, i * 0.5 + 0.25, 0.24, 0.45);
  }
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
 * 새 업무/공지 알림. 긴급이면 확인(stopAlarm)할 때까지 사이렌과 진동을 반복한다.
 */
export function alert(opts: { title: string; body: string; urgent: boolean; tag: string; prefs: AlertPrefs }) {
  const { title, body, urgent, tag, prefs } = opts;
  void systemNotify(title, body, urgent, tag);
  if (prefs.voice) speak(`${urgent ? '긴급 요청. ' : ''}${title}. ${body}`);

  const ring = () => {
    if (prefs.sound) (urgent ? siren : chime)();
    if (prefs.vibrate) navigator.vibrate?.(urgent ? [500, 200, 500, 200, 500] : [200, 100, 200]);
  };
  ring();
  if (urgent) {
    stopAlarm();
    alarmTimer = window.setInterval(ring, 4000);
  }
}

export function stopAlarm() {
  if (alarmTimer !== null) clearInterval(alarmTimer);
  alarmTimer = null;
  navigator.vibrate?.(0);
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/marton/sw.js', { scope: '/marton/' }).catch(() => { /* 개발환경 등 */ });
  }
}
