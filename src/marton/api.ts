import type { Bootstrap, Staff, StreamEvent } from './shared';

const TOKEN_KEY = 'marton-token';

export const session = {
  get token() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token: string | null) {
    try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* 저장 불가 환경 */ }
  },
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/marton${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || '서버와 연결할 수 없습니다.', res.status);
  return data as T;
}

export const login = (input: { storeCode?: string; staffId: string; name: string; dept: string; duty: string; wantManager: boolean; managerPin?: string; title?: string; level?: string }) =>
  api<{ token: string; staff: Staff }>('/login', input);

export const bootstrap = () => api<Bootstrap>('/bootstrap');

/** SSE 연결. 끊기면 브라우저가 자동 재연결하고, 재연결 시 onReconnect로 전체 동기화한다. */
export function connectStream(onEvent: (e: StreamEvent) => void, onStatus: (connected: boolean) => void, onReconnect: () => void) {
  const es = new EventSource(`/api/marton/stream?token=${encodeURIComponent(session.token || '')}`);
  let wasDisconnected = false;
  es.onopen = () => {
    onStatus(true);
    if (wasDisconnected) onReconnect();
    wasDisconnected = false;
  };
  es.onerror = () => {
    onStatus(false);
    wasDisconnected = true;
  };
  es.onmessage = m => {
    try { onEvent(JSON.parse(m.data)); } catch { /* 잘못된 이벤트 무시 */ }
  };
  return () => es.close();
}
