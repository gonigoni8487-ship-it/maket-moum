import { useEffect, useMemo, useState } from 'react';
import { Coffee, RefreshCw } from 'lucide-react';
import { COUPON_COUNTS, DEPARTMENTS, type Department, type StaffLevel } from '../shared';
import { api } from '../api';
import { Chip, cx, Empty, inputCls, Section } from '../ui';

type Person = { id: string; name: string; dept: Department; duty: string; level?: StaffLevel };
type SentRow = { to: Person; total: number; used: number; last: number };
type Filter = 'all' | StaffLevel | Department;

const PLACE_KEY = 'marton-coupon-place';

/** 점장·부점장: 소통 커피쿠폰 보내기 (최대 60명에게 1·5·10장씩) */
export default function CouponSend({ onError, onToast }: { onError: (m: string) => void; onToast: (m: string) => void }) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [sent, setSent] = useState<SentRow[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [count, setCount] = useState<number>(5);
  const [place, setPlace] = useState(() => { try { return localStorage.getItem(PLACE_KEY) ?? ''; } catch { return ''; } });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api<Person[]>('/staff').then(setPeople, e => onError(e.message));
    api<SentRow[]>('/coupons/sent').then(setSent, () => {});
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => (people ?? []).filter(p =>
    filter === 'all' || p.level === filter || p.dept === filter), [people, filter]);
  const allShownPicked = shown.length > 0 && shown.every(p => picked.has(p.id));
  const toggle = (id: string) => setPicked(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleShown = () => setPicked(s => {
    const n = new Set(s);
    shown.forEach(p => (allShownPicked ? n.delete(p.id) : n.add(p.id)));
    return n;
  });

  const submit = async () => {
    if (!picked.size) return onError('받을 직원을 골라 주세요.');
    setBusy(true);
    try {
      try { localStorage.setItem(PLACE_KEY, place); } catch { /* 무시 */ }
      const r = await api<{ people: number; coupons: number }>('/coupons', { to: [...picked], count, place, message });
      onToast(`☕ ${r.people}명에게 커피쿠폰 ${count}장씩 (총 ${r.coupons}장) 보냈습니다.`);
      setPicked(new Set());
      setMessage('');
      load();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const levelCount = (l: StaffLevel) => (people ?? []).filter(p => p.level === l).length;

  return (
    <Section title="소통 커피쿠폰 보내기" right={<button onClick={load} aria-label="새로고침" className="rounded-lg p-1 text-slate-500"><RefreshCw className="size-4" /></button>}>
      <div className="space-y-3 rounded-2xl bg-[#f3e9dc] p-4">
        <div className="flex flex-wrap gap-2">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>전체 {people?.length ?? ''}</Chip>
          <Chip active={filter === '시니어'} onClick={() => setFilter('시니어')}>시니어 담당 {levelCount('시니어')}</Chip>
          <Chip active={filter === '주니어'} onClick={() => setFilter('주니어')}>주니어 담당 {levelCount('주니어')}</Chip>
          {DEPARTMENTS.map(d => <Chip key={d} active={filter === d} onClick={() => setFilter(d)}>{d}</Chip>)}
        </div>

        <div className="overflow-hidden rounded-xl bg-white">
          <button type="button" onClick={toggleShown} className="flex w-full items-center gap-3 border-b border-slate-100 px-3.5 py-2.5 text-sm font-bold text-[#4a2c1d]">
            <input type="checkbox" readOnly checked={allShownPicked} className="size-5 accent-[#4a2c1d]" tabIndex={-1} />
            {allShownPicked ? '모두 해제' : '보이는 직원 모두 선택'} ({shown.length}명)
          </button>
          <div className="max-h-72 overflow-y-auto">
            {people === null ? <p className="p-4 text-sm text-slate-500">불러오는 중…</p>
              : !shown.length ? <Empty>해당하는 직원이 없습니다. 직원이 앱에 한 번 로그인해야 목록에 나옵니다.</Empty>
              : shown.map(p => (
                <label key={p.id} className="flex items-center gap-3 border-b border-slate-50 px-3.5 py-2.5 text-sm">
                  <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} className="size-5 accent-[#4a2c1d]" />
                  <span className="font-semibold text-slate-900">{p.name}</span>
                  <span className="text-slate-500">{p.dept} · {p.duty}</span>
                  {p.level && <span className={cx('ml-auto rounded px-1.5 text-xs font-bold', p.level === '시니어' ? 'bg-[#4a2c1d] text-white' : 'bg-[#e6d2bd] text-[#4a2c1d]')}>{p.level}</span>}
                </label>
              ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-[#7a4a2e]">한 명당 쿠폰 수 (1번부터 순서대로)</span>
          <div className="grid grid-cols-3 gap-2">
            {COUPON_COUNTS.map(n => (
              <button key={n} type="button" onClick={() => setCount(n)} aria-pressed={count === n}
                className={cx('rounded-xl border-2 py-2.5 font-black', count === n ? 'border-[#4a2c1d] bg-[#4a2c1d] text-white' : 'border-[#d9c2aa] bg-white text-[#4a2c1d]')}>
                {n}장
              </button>
            ))}
          </div>
        </div>
        <input className={inputCls} value={place} onChange={e => setPlace(e.target.value)} placeholder="사용처 (예: 매장 내 이디야커피)" maxLength={40} />
        <input className={inputCls} value={message} onChange={e => setMessage(e.target.value)} placeholder="한마디 (선택, 예: 이번 주 행사 준비 수고 많았어요)" maxLength={100} />
        <p className="text-xs text-[#7a6a5e]">사용처 커피 매장과 미리 약속된 경우에만 보내 주세요. 직원은 보관함에서 쿠폰을 열어 실시간 시계가 움직이는 화면을 보여 주고, 커피를 받으면 "사용 완료"를 눌러 처리합니다.</p>
        <button type="button" onClick={submit} disabled={busy || !picked.size}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4a2c1d] py-3.5 text-[15px] font-bold text-white disabled:opacity-50">
          <Coffee className="size-5" />{busy ? '보내는 중…' : picked.size ? `${picked.size}명에게 ${count}장씩 보내기` : '받을 직원을 골라 주세요'}
        </button>

        {sent.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-semibold text-[#7a4a2e]">보낸 쿠폰 사용 현황</span>
            <div className="divide-y divide-[#eadccd] rounded-xl bg-white text-sm">
              {sent.slice(0, 15).map(r => (
                <div key={r.to.id} className="flex items-center gap-2 px-3.5 py-2">
                  <span className="font-semibold">{r.to.name}</span>
                  <span className="text-xs text-slate-500">{r.to.dept}{r.to.level ? ` · ${r.to.level}` : ''}</span>
                  <span className="ml-auto tabular-nums text-[#4a2c1d]">{r.used}/{r.total}장 사용</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
