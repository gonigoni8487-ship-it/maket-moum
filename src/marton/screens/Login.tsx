import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { DEPARTMENTS, DUTIES, type Department, type Staff } from '../shared';
import { login, session } from '../api';
import { unlockAudio, requestNotificationPermission } from '../alerts';
import { Chip, inputCls, primaryBtn } from '../ui';

const LAST_KEY = 'marton-last-login';

export default function Login({ onLogin }: { onLogin: (staff: Staff) => void }) {
  const last = (() => { try { return JSON.parse(localStorage.getItem(LAST_KEY) || '{}'); } catch { return {}; } })();
  const [staffId, setStaffId] = useState<string>(last.staffId || '');
  const [name, setName] = useState<string>(last.name || '');
  const [dept, setDept] = useState<Department | ''>(last.dept || '');
  const [duty, setDuty] = useState<string>(last.duty || '');
  const [wantManager, setWantManager] = useState(false);
  const [title, setTitle] = useState('점장');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    unlockAudio(); // 터치 시점에 오디오 잠금 해제 (모바일 정책)
    setBusy(true);
    setError('');
    try {
      const { token, staff } = await login({ staffId, name, dept, duty, wantManager, managerPin: pin, title });
      session.set(token);
      try { localStorage.setItem(LAST_KEY, JSON.stringify({ staffId, name, dept, duty })); } catch { /* 무시 */ }
      void requestNotificationPermission();
      onLogin(staff);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-6 px-4 pb-10 pt-8">
      <div>
        <div className="text-3xl font-black tracking-tight text-slate-900">마트<span className="text-blue-600">ON</span></div>
        <p className="mt-1 text-sm text-slate-500">말하면 연결하고, 찍으면 알려주고, 요청하면 처리되는 매장 AI</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">사번</span>
          <input className={inputCls} inputMode="numeric" value={staffId} onChange={e => setStaffId(e.target.value)} placeholder="예: 24017" required />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">이름</span>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" required />
        </label>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">오늘 근무 부서</span>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map(d => (
            <Chip key={d} active={dept === d} onClick={() => { setDept(d); setDuty(''); }}>{d}</Chip>
          ))}
        </div>
      </div>

      {dept && (
        <div className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">담당 업무</span>
          <div className="flex flex-wrap gap-2">
            {DUTIES[dept].map(d => <Chip key={d} active={duty === d} onClick={() => setDuty(d)}>{d}</Chip>)}
          </div>
          <input className={inputCls} value={duty} onChange={e => setDuty(e.target.value)} placeholder="직접 입력" />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <label className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800"><ShieldCheck className="size-4 text-blue-600" />점장/부점장으로 로그인</span>
          <input type="checkbox" className="size-5 accent-blue-600" checked={wantManager} onChange={e => setWantManager(e.target.checked)} />
        </label>
        {wantManager && (
          <div className="grid grid-cols-2 gap-3">
            <select className={inputCls} value={title} onChange={e => setTitle(e.target.value)}>
              <option>점장</option><option>부점장</option><option>파트장</option>
            </select>
            <input className={inputCls} type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} placeholder="관리자 PIN" />
          </div>
        )}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">{error}</p>}
      <button className={primaryBtn} disabled={busy || !staffId || !name || !dept || !duty}>
        {busy ? '로그인 중…' : '출근 · 로그인'}
      </button>
      <p className="text-center text-xs text-slate-400">로그인하면 알림 권한을 요청합니다. 업무요청 알림을 받으려면 허용해 주세요.</p>
    </form>
  );
}
