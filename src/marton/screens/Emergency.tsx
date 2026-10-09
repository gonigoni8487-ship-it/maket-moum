import { useState } from 'react';
import { Siren, X } from 'lucide-react';
import { EMERGENCY_INFO, EMERGENCY_TYPES, type Emergency, type EmergencyType } from '../shared';
import { api } from '../api';
import { unlockAudio } from '../alerts';
import { cx, inputCls } from '../ui';

/** 비상 알림 보내기: 화재·사고·재난을 고르고 위치를 적으면 전 직원 휴대폰에 사이렌 */
export function EmergencySheet({ onClose, onSent, onError }: { onClose: () => void; onSent: (e: Emergency) => void; onError: (m: string) => void }) {
  const [type, setType] = useState<EmergencyType | null>(null);
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!type) return;
    unlockAudio();
    setBusy(true);
    try { onSent(await api<Emergency>('/emergencies', { type, location })); }
    catch (e) { onError((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-2xl space-y-4 rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()} role="dialog" aria-label="비상 알림">
        <div className="flex items-center gap-2">
          <Siren className="size-6 text-red-600" />
          <h2 className="text-lg font-black text-slate-900">비상 알림</h2>
          <button onClick={onClose} aria-label="닫기" className="ml-auto rounded-full p-1.5 text-slate-500"><X className="size-5" /></button>
        </div>
        <p className="text-sm text-slate-600">전 직원 휴대폰에 <b className="text-red-600">사이렌</b>이 울립니다. 화재·사고·재난 때만 눌러 주세요.</p>
        <div className="grid grid-cols-3 gap-2">
          {EMERGENCY_TYPES.map(t => (
            <button key={t} onClick={() => setType(t)} aria-pressed={type === t}
              className={cx('flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-4', type === t ? 'border-red-600 bg-red-600 text-white' : 'border-red-200 bg-red-50 text-red-700')}>
              <span className="text-3xl">{EMERGENCY_INFO[t].icon}</span>
              <span className="text-[15px] font-black">{t}</span>
              <span className={cx('text-[11px] leading-tight', type === t ? 'text-red-100' : 'text-red-500')}>{EMERGENCY_INFO[t].hint}</span>
            </button>
          ))}
        </div>
        <input className={inputCls} value={location} onChange={e => setLocation(e.target.value)} maxLength={60} placeholder="위치 (예: 지하 1층 수산 코너) — 모르면 비워 두세요" />
        <button onClick={submit} disabled={!type || busy} className="w-full rounded-2xl bg-red-600 py-4 text-lg font-black text-white active:bg-red-700 disabled:opacity-40">
          {busy ? '알리는 중…' : type ? `🚨 ${type} — 전 직원에게 알리기` : '상황을 먼저 골라 주세요'}
        </button>
      </div>
    </div>
  );
}

/** 비상 상황 화면 내용 (행동 요령) */
export function EmergencyDetail({ e }: { e: Emergency }) {
  const info = EMERGENCY_INFO[e.type];
  return (
    <div className="w-full max-w-sm">
      <div className="text-6xl">{info.icon}</div>
      <div className="mt-2 text-4xl font-black">{e.type}</div>
      {e.location && <div className="mt-2 text-2xl font-bold">📍 {e.location}</div>}
      <div className="mt-1 text-sm text-red-100">{e.by.dept} {e.by.name} · {new Date(e.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
      <ol className="mt-4 space-y-1.5 rounded-2xl bg-black/20 p-4 text-left text-[15px] font-semibold">
        {info.guide.map((g, i) => <li key={i}>{i + 1}. {g}</li>)}
      </ol>
    </div>
  );
}
