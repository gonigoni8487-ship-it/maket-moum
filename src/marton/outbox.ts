// 오프라인 대비: 전송에 실패한 요청·신고·처리 상태를 기기에 보관했다가 연결되면 자동 전송한다.
import { api, ApiError } from './api';

interface Pending {
  id: string;
  path: string;
  body: Record<string, unknown>;
  label: string;
  at: number;
}

const KEY = 'marton-outbox';
const listeners = new Set<(items: Pending[]) => void>();
let flushing = false;

function read(): Pending[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(items: Pending[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* 저장 불가 */ }
  listeners.forEach(l => l(items));
}

export const pendingItems = read;

export function onOutboxChange(l: (items: Pending[]) => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** 네트워크 자체가 실패한 경우만 보관 대상 (서버가 거절한 요청은 다시 보내도 실패) */
const isNetworkError = (e: unknown) => !(e instanceof ApiError) || e.status >= 500 || e.status === 0;

const uid = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).slice(0, 18);

/**
 * 전송하고, 연결이 안 되면 보관한다. 보관되면 null을 돌려준다.
 * 생성 요청에는 clientId를 붙여 재전송 시 서버가 중복 생성하지 않게 한다.
 */
export async function send<T>(path: string, body: Record<string, unknown>, label: string): Promise<T | null> {
  const payload = { ...body, clientId: body.clientId ?? uid() };
  if (navigator.onLine === false) {
    enqueue(path, payload, label);
    return null;
  }
  try {
    return await api<T>(path, payload);
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    enqueue(path, payload, label);
    return null;
  }
}

function enqueue(path: string, body: Record<string, unknown>, label: string) {
  write([...read(), { id: uid(), path, body, label, at: Date.now() }]);
}

/** 보관된 항목을 순서대로 보낸다. 반환: 보낸 건수, 서버가 거절해 버린 항목 */
export async function flush(): Promise<{ sent: number; dropped: string[] }> {
  const result = { sent: 0, dropped: [] as string[] };
  if (flushing || navigator.onLine === false) return result;
  flushing = true;
  try {
    for (const item of read()) {
      try {
        await api(item.path, item.body);
        result.sent++;
      } catch (e) {
        if (isNetworkError(e)) break; // 아직 연결 불안정 → 다음 기회에
        result.dropped.push(`${item.label}: ${(e as Error).message}`);
      }
      write(read().filter(x => x.id !== item.id));
    }
  } finally {
    flushing = false;
  }
  return result;
}

/** 로그아웃 시 다른 직원 이름으로 전송되지 않도록 비운다 */
export function clearOutbox() {
  write([]);
}
