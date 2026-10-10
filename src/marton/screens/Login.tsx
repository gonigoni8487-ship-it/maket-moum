import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { DEPARTMENTS, DUTIES, STAFF_LEVELS, STAFF_RANKS, normalizePhone, type Department, type Staff } from '../shared';
import { api, login, session } from '../api';
import { unlockAudio, requestNotificationPermission } from '../alerts';
import { Chip, cx, inputCls, primaryBtn } from '../ui';

const LAST_KEY = 'marton-last-login';

export default function Login({ onLogin }: { onLogin: (staff: Staff) => void }) {
  const last = (() => { try { return JSON.parse(localStorage.getItem(LAST_KEY) || '{}'); } catch { return {}; } })();
  const [store, setStore] = useState<string>(last.store || '');
  const [rank, setRank] = useState<string>(last.rank || '');
  const [phone, setPhone] = useState<string>(last.phone || '');
  const [staffId, setStaffId] = useState<string>(last.staffId || '');
  const [name, setName] = useState<string>(last.name || '');
  const [dept, setDept] = useState<Department | ''>(last.dept || '');
  const [duty, setDuty] = useState<string>(last.duty || '');
  const [wantManager, setWantManager] = useState(false);
  const [title, setTitle] = useState('점장');
  const [pin, setPin] = useState('');
  const [level, setLevel] = useState<string>(last.level ?? '');
  const [birthday, setBirthday] = useState<string>(last.birthday ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [storeCode, setStoreCode] = useState<string>(last.storeCode || '');
  const [needCode, setNeedCode] = useState(false);
  useEffect(() => { api<{ storeCodeRequired: boolean }>('/config').then(c => setNeedCode(c.storeCodeRequired), () => {}); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    unlockAudio(); // 터치 시점에 오디오 잠금 해제 (모바일 정책)
    setBusy(true);
    setError('');
    try {
      const { token, staff } = await login({ storeCode, store, staffId, rank, name, phone, dept, duty, wantManager, managerPin: pin, title, level: level || undefined, birthday: birthday || undefined });
      session.set(token);
      try { localStorage.setItem(LAST_KEY, JSON.stringify({ store, staffId, rank, name, phone, dept, duty, storeCode, level, birthday })); } catch { /* 무시 */ }
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

      {needCode && (
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">매장 접속 코드</span>
          <input className={inputCls} type="password" value={storeCode} onChange={e => setStoreCode(e.target.value)} placeholder="매장에서 안내받은 코드" required />
        </label>
      )}

      <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-bold text-slate-800">회원 정보</legend>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">점명</span>
          <input className={inputCls} value={store} onChange={e => setStore(e.target.value)} placeholder="예: 화명점" maxLength={20} required />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">사번</span>
            <input className={inputCls} inputMode="numeric" value={staffId} onChange={e => setStaffId(e.target.value)} placeholder="예: 24017" required />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">직급</span>
            <input className={inputCls} list="marton-ranks" value={rank} onChange={e => setRank(e.target.value)} placeholder="예: 주임" maxLength={10} required />
            <datalist id="marton-ranks">{STAFF_RANKS.map(r => <option key={r} value={r} />)}</datalist>
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STAFF_RANKS.map(r => <button key={r} type="button" onClick={() => setRank(r)} aria-pressed={rank === r} className={cx('rounded-full border px-3 py-1 text-xs font-semibold', rank === r ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600')}>{r}</button>)}
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">성명</span>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="예: 홍길동" required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">전화번호</span>
          <input className={inputCls} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => setPhone(p => normalizePhone(p) ?? p)} placeholder="예: 010-1234-5678" required />
          <span className="block text-xs text-slate-400">본인과 점장·부점장만 볼 수 있습니다.</span>
        </label>
      </fieldset>

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

      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">담당 구분 <span className="font-normal text-slate-400">(선택 · 소통 쿠폰 받을 때 사용)</span></span>
        <div className="flex flex-wrap gap-2">
          {STAFF_LEVELS.map(l => <Chip key={l} active={level === l} onClick={() => setLevel(v => (v === l ? '' : l))}>{l} 담당</Chip>)}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-slate-700">생년월일 <span className="font-normal text-slate-400">(선택 · 생일에 축하 메시지를 보내 드려요)</span></span>
        <input type="date" className={inputCls} value={birthday} onChange={e => setBirthday(e.target.value)} max="2015-12-31" min="1940-01-01" />
      </label>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <label className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800"><ShieldCheck className="size-4 text-blue-600" />점장/부점장으로 로그인</span>
          <input type="checkbox" className="size-5 accent-blue-600" checked={wantManager} onChange={e => setWantManager(e.target.checked)} />
        </label>
        {wantManager && (
          <div className="grid grid-cols-2 gap-3">
            <select className={inputCls} value={title} onChange={e => setTitle(e.target.value)}>
              <option>점장</option><option>영업부점장</option><option>지원부점장</option>
            </select>
            <input className={inputCls} type="password" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={pin} onChange={e => setPin(e.target.value)} placeholder="관리자 비밀번호 (영문·숫자·기호)" />
          </div>
        )}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">{error}</p>}
      <button className={primaryBtn} disabled={busy || !store.trim() || !staffId || !rank.trim() || !name || !phone || !dept || !duty}>
        {busy ? '로그인 중…' : '출근 · 로그인'}
      </button>
      <p className="text-center text-xs text-slate-400">로그인하면 알림 권한을 요청합니다. 업무요청 알림을 받으려면 허용해 주세요.</p>
    </form>
  );
}
