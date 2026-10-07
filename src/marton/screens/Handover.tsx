import { useState } from 'react';
import { ArrowRightLeft, Check, LogOut, Siren, ShieldAlert, X } from 'lucide-react';
import { HANDOVER_CHIPS, canSeeIncident, type Handover, type Incident, type Staff, type Task } from '../shared';
import { send } from '../outbox';
import { clock, cx, Empty, inputCls, Section, STATUS_STYLE } from '../ui';

function Summary({ tasks, incidents }: { tasks: Handover['openTasks']; incidents: Handover['openIncidents'] }) {
  if (!tasks.length && !incidents.length) return <p className="text-sm text-slate-500">미처리 업무·보안 이슈 없음</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {tasks.map(t => (
        <li key={t.id} className="flex items-center gap-2">
          <span className={cx('w-12 shrink-0 rounded-md px-1.5 py-0.5 text-center text-xs font-bold', STATUS_STYLE[t.status])}>{t.status}</span>
          {t.urgent && <Siren className="size-3.5 shrink-0 text-red-600" />}
          <span className="truncate text-slate-800">{t.title}</span>
          <span className="ml-auto shrink-0 text-xs text-slate-400">{t.fromDept}</span>
        </li>
      ))}
      {incidents.map(i => (
        <li key={i.id} className="flex items-center gap-2">
          <ShieldAlert className="size-4 shrink-0 text-red-600" />
          <span className="truncate text-slate-800">보안 {i.type} · {i.zone}</span>
          <span className="ml-auto shrink-0 text-xs text-slate-400">{i.status}</span>
        </li>
      ))}
    </ul>
  );
}

/** 퇴근 시: 우리 부서 미처리 현황을 자동으로 모으고 메모를 붙여 다음 근무자에게 넘긴다 */
export function HandoverSheet({ me, tasks, incidents, onDone, onCancel, onError }: {
  me: Staff; tasks: Task[]; incidents: Incident[];
  onDone: () => void; onCancel: () => void; onError: (m: string) => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const openTasks = tasks.filter(t => t.toDept === me.dept && t.status !== '완료')
    .map(t => ({ id: t.id, title: t.title, status: t.status, urgent: t.urgent, fromDept: t.fromDept }));
  const openIncidents = incidents.filter(i => i.dept === me.dept && i.status !== '종결' && !i.test && canSeeIncident(me, i))
    .map(i => ({ id: i.id, zone: i.zone, type: i.type, status: i.status }));

  const addChip = (c: string) => setNote(n => (n.includes(c) ? n : n ? `${n}\n${c}` : c));

  const submit = async () => {
    setBusy(true);
    try {
      await send('/handovers', { note }, `${me.dept} 인수인계`);
      onDone();
    } catch (e) {
      onError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-slate-900/60" onClick={onCancel}>
      <div className="mx-auto max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><ArrowRightLeft className="size-5 text-blue-600" />{me.dept} 인수인계</h2>
          <button onClick={onCancel} aria-label="닫기" className="p-1 text-slate-500"><X className="size-5" /></button>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 text-xs font-bold text-slate-500">자동 요약 · 다음 근무자에게 그대로 전달됩니다</div>
          <Summary tasks={openTasks} incidents={openIncidents} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {HANDOVER_CHIPS.map(c => <button key={c} type="button" onClick={() => addChip(c)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{c}</button>)}
        </div>
        <textarea className={cx(inputCls, 'min-h-24')} value={note} onChange={e => setNote(e.target.value)} placeholder="전달할 내용 (예: 연어 오후 입고분 진열 못함, 2번 냉장고 온도 확인 필요)" maxLength={1000} />
        <button onClick={submit} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-[15px] font-bold text-white disabled:opacity-50">
          <LogOut className="size-4" />{busy ? '남기는 중…' : '인수인계 남기고 퇴근'}
        </button>
        <button onClick={onDone} disabled={busy} className="w-full py-2 text-sm font-semibold text-slate-500">인수인계 없이 퇴근</button>
      </div>
    </div>
  );
}

function HandoverCard({ h, me, onError }: { h: Handover; me: Staff; onError: (m: string) => void }) {
  const acked = h.ackBy.some(a => a.id === me.id);
  const ack = () => send(`/handovers/${h.id}/ack`, {}, '인수인계 확인').catch(e => onError((e as Error).message));
  return (
    <article className={cx('rounded-2xl border bg-white p-4', acked ? 'border-slate-200' : 'border-blue-300 ring-2 ring-blue-100')}>
      <div className="flex items-center gap-1.5 text-xs">
        <ArrowRightLeft className="size-3.5 text-blue-600" />
        <span className="font-bold text-slate-700">{h.dept} 인수인계</span>
        <span className="text-slate-400">{h.from.name} · {new Date(h.createdAt).toLocaleDateString('ko-KR')} {clock(h.createdAt)}</span>
      </div>
      {h.note && <p className="mt-2 whitespace-pre-wrap text-[15px] font-medium text-slate-900">{h.note}</p>}
      <div className="mt-3 rounded-xl bg-slate-50 p-3"><Summary tasks={h.openTasks} incidents={h.openIncidents} /></div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{h.ackBy.length ? `확인: ${h.ackBy.map(a => a.name).join(', ')}` : '아직 확인한 사람 없음'}</span>
        {!acked && h.from.id !== me.id && (
          <button onClick={ack} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white"><Check className="size-3.5" />인수 확인</button>
        )}
      </div>
    </article>
  );
}

/** 출근 후 업무 탭 상단: 아직 확인하지 않은 우리 부서 인수인계 */
export function HandoverInbox({ handovers, me, onError }: { handovers: Handover[]; me: Staff; onError: (m: string) => void }) {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const mine = handovers
    .filter(h => h.dept === me.dept && h.from.id !== me.id && h.createdAt > since && !h.ackBy.some(a => a.id === me.id))
    .sort((a, b) => b.createdAt - a.createdAt);
  if (!mine.length) return null;
  return <div className="mb-4 space-y-3">{mine.map(h => <HandoverCard key={h.id} h={h} me={me} onError={onError} />)}</div>;
}

/** 점장 화면: 부서별 최근 인수인계와 확인 여부 */
export function HandoverList({ handovers, me, onError }: { handovers: Handover[]; me: Staff; onError: (m: string) => void }) {
  const recent = [...handovers].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  return (
    <Section title="근무 교대 인수인계">
      {recent.length ? recent.map(h => <HandoverCard key={h.id} h={h} me={me} onError={onError} />) : <Empty>최근 인수인계 없음</Empty>}
    </Section>
  );
}
