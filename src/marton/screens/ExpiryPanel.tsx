import { useRef, useState } from 'react';
import { BellRing, CheckCircle2, Download, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import { DEPARTMENTS, storeTime, type Department, type ExpiryCheck, type Staff } from '../shared';
import { api } from '../api';
import { downloadCsv, expiryTemplate, parseExpiry, readRows, storeMillis, type ExpiryDraft } from '../sheets';
import { Chip, cx, Empty, inputCls } from '../ui';

const pad = (n: number) => String(n).padStart(2, '0');
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const dayLabel = (t: number) => { const s = storeTime(t); return `${s.month}월 ${s.date}일 (${WEEK[s.day]})`; };
const timeLabel = (t: number) => { const d = new Date(t + 9 * 3600000); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };

/** 점장·부점장: 점검표 파일 올리기 또는 직접 추가 */
function ExpiryEditor({ onError, onToast }: { onError: (m: string) => void; onToast: (m: string) => void }) {
  const today = storeTime(Date.now());
  const [preview, setPreview] = useState<ExpiryDraft[] | null>(null);
  const [form, setForm] = useState<ExpiryDraft>({ date: `${today.year}-${pad(today.month)}-${pad(today.date)}`, time: '10:00', dept: '가공', area: '' });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveAll = async (items: ExpiryDraft[]) => {
    setBusy(true);
    try {
      const r = await api<{ saved: number }>('/expiry', { items: items.map(i => ({ ...i, at: storeMillis(i.date, i.time) })) });
      onToast(`소비기한 점검 ${r.saved}건을 등록했습니다. 시간이 되면 해당 파트를 호출합니다.`);
      setPreview(null);
      setForm(f => ({ ...f, area: '', assignee: '', note: '' }));
    } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };
  const fromFile = async (f?: File) => {
    if (!f) return;
    try {
      const items = parseExpiry(await readRows(f), today.year);
      if (!items.length) return onError('점검 일정을 찾지 못했습니다. 날짜·시간·파트·구역 칸이 있는지 확인해 주세요. (양식 받기 참고)');
      setPreview(items);
    } catch (e) { onError((e as Error).message); }
  };

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4">
      <div className="grid grid-cols-2 gap-2 text-xs font-bold">
        <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-white"><FileSpreadsheet className="size-4" />점검표 올리기 (엑셀·CSV)</button>
        <button onClick={() => downloadCsv('소비기한_점검_양식.csv', expiryTemplate())} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-slate-700"><Download className="size-4" />양식 받기</button>
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" hidden onChange={e => { void fromFile(e.target.files?.[0]); e.target.value = ''; }} />
      {preview && (
        <div className="space-y-2 rounded-xl bg-blue-50 p-3 text-sm">
          <p className="font-bold text-blue-900">{preview.length}건 — {[...new Set(preview.map(p => p.dept))].join('·')}</p>
          <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs text-blue-900">
            {preview.slice(0, 30).map((p, i) => <li key={i}>{p.date.slice(5)} {p.time} · {p.dept} · {p.area}{p.assignee ? ` · ${p.assignee}` : ''}</li>)}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPreview(null)} className="rounded-lg bg-white py-2 font-bold text-slate-700">취소</button>
            <button onClick={() => saveAll(preview)} disabled={busy} className="rounded-lg bg-blue-600 py-2 font-bold text-white disabled:opacity-50">{preview.length}건 등록</button>
          </div>
        </div>
      )}

      <details className="rounded-xl bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-700">직접 추가</summary>
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" aria-label="날짜" className={inputCls} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            <input type="time" aria-label="시간" className={inputCls} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-2">{DEPARTMENTS.map(d => <Chip key={d} active={form.dept === d} onClick={() => setForm({ ...form, dept: d as Department })}>{d}</Chip>)}</div>
          <input className={inputCls} value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="구역·품목 (예: 유제품 냉장 쇼케이스)" maxLength={60} />
          <input className={inputCls} value={form.assignee ?? ''} onChange={e => setForm({ ...form, assignee: e.target.value })} placeholder="담당자 (선택)" maxLength={20} />
          <button onClick={() => (form.area.trim() ? saveAll([form]) : onError('구역·품목을 입력해 주세요.'))} disabled={busy} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-3 text-sm font-bold text-white"><Plus className="size-4" />점검 일정 추가</button>
        </div>
      </details>
    </div>
  );
}

/** 소비기한 점검 일정: 날짜별, 시간이 되면 파트 호출 · 점검 완료 처리 */
export default function ExpiryPanel({ checks, me, onError, onToast }: { checks: ExpiryCheck[]; me: Staff; onError: (m: string) => void; onToast: (m: string) => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const visible = checks.filter(c => me.role === 'manager' || c.dept === me.dept).sort((a, b) => a.at - b.at);
  const upcoming = visible.filter(c => !c.doneAt);
  const done = visible.filter(c => c.doneAt).reverse().slice(0, 10);
  const groups = new Map<string, ExpiryCheck[]>();
  upcoming.forEach(c => groups.set(dayLabel(c.at), [...(groups.get(dayLabel(c.at)) ?? []), c]));

  const act = async (c: ExpiryCheck, path: 'done' | 'delete') => {
    setBusyId(c.id);
    try {
      await api(`/expiry/${c.id}/${path}`, {});
      if (path === 'done') onToast(`${c.area} 소비기한 점검 완료로 기록했습니다.`);
    } catch (e) { onError((e as Error).message); } finally { setBusyId(null); }
  };

  return (
    <div className="space-y-3">
      {me.role === 'manager' && <ExpiryEditor onError={onError} onToast={onToast} />}
      {!upcoming.length && <Empty>{me.role === 'manager' ? '등록된 점검 일정이 없습니다.' : `${me.dept} 파트의 소비기한 점검 일정이 없습니다.`}</Empty>}
      {[...groups].map(([label, list]) => (
        <section key={label} className="space-y-2">
          <h3 className="text-sm font-bold text-slate-700">{label}</h3>
          {list.map(c => {
            const overdue = c.at <= Date.now();
            return (
              <div key={c.id} className={cx('space-y-2 rounded-2xl border bg-white p-3.5', c.calledAt ? 'border-orange-300' : 'border-slate-200')}>
                <div className="flex items-start gap-2">
                  <span className={cx('rounded-lg px-2 py-1 font-mono text-sm font-black', overdue ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700')}>{timeLabel(c.at)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{c.area}</p>
                    <p className="text-xs text-slate-500">{c.dept}{c.assignee ? ` · 담당 ${c.assignee}` : ''}{c.note ? ` · ${c.note}` : ''}</p>
                  </div>
                  {c.calledAt && <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700"><BellRing className="size-3" />호출됨</span>}
                </div>
                <div className="flex gap-2">
                  {(c.dept === me.dept || me.role === 'manager') && (
                    <button onClick={() => act(c, 'done')} disabled={busyId === c.id} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="size-4" />점검 완료</button>
                  )}
                  {me.role === 'manager' && <button onClick={() => act(c, 'delete')} disabled={busyId === c.id} aria-label="일정 지우기" className="rounded-xl bg-slate-100 px-3 text-slate-500"><Trash2 className="size-4" /></button>}
                </div>
              </div>
            );
          })}
        </section>
      ))}
      {done.length > 0 && (
        <section className="space-y-1.5">
          <h3 className="text-sm font-bold text-slate-500">완료한 점검</h3>
          {done.map(c => (
            <p key={c.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-500">
              <CheckCircle2 className="size-4 text-emerald-600" />{dayLabel(c.at)} {timeLabel(c.at)} · {c.dept} · {c.area} — {c.doneBy?.name}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
