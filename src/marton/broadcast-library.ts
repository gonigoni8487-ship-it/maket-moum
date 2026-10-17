// 만든 매장 방송 보관함: 이 기기(IndexedDB)에 MP3로 최근 20개 보관 → 다시 듣기·내려받기 (다시 만들지 않아도 됨)
export interface SavedBroadcast {
  id: string;
  title: string;
  theme: string;
  hosts: string;
  seconds: number;
  createdAt: number;
  mp3: Blob;
}

const DB_NAME = 'marton-broadcasts';
const STORE = 'items';
const KEEP = 20;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req ? req.result : undefined); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

/** 최근 것부터. 저장소를 못 쓰는 환경(사생활 보호 모드 등)이면 빈 목록 */
export async function listBroadcasts(): Promise<SavedBroadcast[]> {
  try {
    const all = (await run<SavedBroadcast[]>('readonly', s => s.getAll())) ?? [];
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/** 저장하고 오래된 것은 지운다. 저장하지 못하면 false */
export async function saveBroadcast(item: SavedBroadcast): Promise<boolean> {
  try {
    await run('readwrite', s => { s.put(item); });
    const old = (await listBroadcasts()).slice(KEEP);
    if (old.length) await run('readwrite', s => { old.forEach(o => s.delete(o.id)); });
    return true;
  } catch {
    return false;
  }
}

export async function deleteBroadcast(id: string) {
  try { await run('readwrite', s => { s.delete(id); }); } catch { /* 이미 없음 */ }
}

/** 파일 내려받기 (휴대폰은 다운로드 폴더, PC는 브라우저 다운로드) */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const safeFileName = (title: string, ext: 'mp3' | 'wav') => `${title.replace(/[\\/:*?"<>|]/g, '').trim() || '롯데마트 매장 방송'}.${ext}`;
