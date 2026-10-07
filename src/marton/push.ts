// 웹 푸시 구독: 앱을 닫거나 화면이 꺼져도 서버가 알림을 보낼 수 있게 이 기기를 등록한다.
import { api } from './api';
import { setPushActive } from './alerts';

export type PushState = 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

function base64ToBytes(base64: string) {
  const b64 = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function registration() {
  if (!('serviceWorker' in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration('/marton/')) ?? navigator.serviceWorker.register('/marton/sw.js', { scope: '/marton/' });
}

export async function pushState(): Promise<PushState> {
  if (!('PushManager' in window) || !('serviceWorker' in navigator)) return isIos() && !isStandalone() ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await (await registration())?.pushManager.getSubscription();
  setPushActive(Boolean(sub) && Notification.permission === 'granted');
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/** 권한 요청 → 구독 → 서버 등록. 로그인한 직원 계정에 이 기기를 연결한다. */
export async function enablePush(): Promise<PushState> {
  const state = await pushState();
  if (state === 'unsupported' || state === 'ios-install' || state === 'denied') return state;
  if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  const reg = await registration();
  if (!reg) return 'unsupported';
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { publicKey } = await api<{ publicKey: string }>('/push/key');
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) });
  }
  await api('/push/subscribe', { subscription: sub.toJSON() });
  setPushActive(true);
  return 'on';
}

/** 로그아웃 시 이 기기를 직원 계정에서 분리 (다른 직원 알림이 오지 않도록) */
export async function detachPush() {
  const sub = await (await registration())?.pushManager.getSubscription().catch(() => null);
  if (sub) await api('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
  setPushActive(false);
}

export const PUSH_LABEL: Record<PushState, string> = {
  on: '켜짐 — 앱을 닫아도 알림이 옵니다',
  off: '꺼짐',
  denied: '차단됨 — 브라우저 설정에서 알림을 허용해 주세요',
  unsupported: '이 브라우저는 푸시를 지원하지 않습니다',
  'ios-install': '아이폰은 공유 → "홈 화면에 추가" 후 앱에서 켜 주세요',
};
