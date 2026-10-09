import { useState } from 'react';
import { ArrowRight, Siren, MapPin, ChevronDown, ImageIcon, X } from 'lucide-react';
import { TASK_STATUSES, type Staff, type Task, type TaskStatus } from '../shared';
import { send } from '../outbox';
import { session } from '../api';
import { cx, elapsed, clock, Empty, STATUS_STYLE } from '../ui';

const NEXT_LABEL: Partial<Record<TaskStatus, string>> = { 확인: '확인했어요', 처리중: '처리 시작', 완료: '처리 완료' };

export function nextStatus(t: Task): TaskStatus | null {
  const i = TASK_STATUSES.indexOf(t.status);
  return i < TASK_STATUSES.length - 1 ? TASK_STATUSES[i + 1] : null;
}

export async function advance(task: Task, status: TaskStatus, note?: string) {
  return send<Task>(`/tasks/${task.id}/status`, { status, note }, `${task.title} → ${status}`);
}

export const photoUrl = (id: string) => `/api/marton/photos/${encodeURIComponent(id)}?token=${encodeURIComponent(session.token ?? '')}`;

/** 요청에 첨부된 사진 (눌러서 크게 보기) */
export function TaskPhotos({ ids, size = 'size-20' }: { ids: string[]; size?: string }) {
  const [big, setBig] = useState<string | null>(null);
  return (
    <>
      <div className="flex gap-2 overflow-x-auto">
        {ids.map(id => (
          <button key={id} type="button" onClick={() => setBig(id)} className={`${size} shrink-0 overflow-hidden rounded-xl bg-slate-200`}>
            <img src={photoUrl(id)} alt="첨부 사진" loading="lazy" className="size-full object-cover" />
          </button>
        ))}
      </div>
      {big && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3" onClick={() => setBig(null)}>
          <img src={photoUrl(big)} alt="첨부 사진 크게 보기" className="max-h-full max-w-full rounded-lg object-contain" />
          <button type="button" aria-label="닫기" className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] rounded-full bg-white/20 p-2 text-white"><X className="size-5" /></button>
        </div>
      )}
    </>
  );
}

export function TaskCard({ task, me, onError }: { task: Task; me: Staff; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const next = nextStatus(task);
  const canAct = next && (task.toDept === me.dept || me.role === 'manager');
  const done = task.status === '완료';

  const act = async () => {
    if (!next) return;
    setBusy(true);
    try { await advance(task, next); } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <article className={cx('rounded-2xl border bg-white p-4 shadow-sm', task.urgent && !done ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200', done && 'opacity-70')}>
      <button type="button" className="w-full text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-1.5 text-xs">
          {task.urgent && <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 font-bold text-white"><Siren className="size-3" />긴급</span>}
          <span className={cx('rounded-md px-1.5 py-0.5 font-bold', STATUS_STYLE[task.status])}>{task.status}</span>
          <span className="font-medium text-slate-500">{task.category}</span>
          <span className="ml-auto text-slate-400">{elapsed(task.createdAt)} 전</span>
        </div>
        <h3 className="mt-2 text-[16px] font-bold leading-snug text-slate-900">{task.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] text-slate-500">
          <span>{task.fromDept} {task.createdBy.name}</span><ArrowRight className="size-3.5" /><span className="font-semibold text-slate-700">{task.toDept}</span>
          {task.location && <span className="inline-flex items-center gap-0.5"><MapPin className="size-3.5" />{task.location}</span>}
          {task.photos?.length ? <span className="inline-flex items-center gap-0.5 font-semibold text-blue-700"><ImageIcon className="size-3.5" />사진 {task.photos.length}</span> : null}
          <ChevronDown className={cx('ml-auto size-4 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          {task.detail && <p className="whitespace-pre-wrap text-sm text-slate-700">{task.detail}</p>}
          {task.photos?.length ? <TaskPhotos ids={task.photos} /> : null}
          <ol className="space-y-1.5">
            {task.history.map((h, i) => (
              <li key={i} className="flex items-center gap-2 text-[13px]">
                <span className={cx('w-12 rounded-md px-1.5 py-0.5 text-center text-xs font-bold', STATUS_STYLE[h.status])}>{h.status}</span>
                <span className="text-slate-700">{h.by.dept} {h.by.name}</span>
                {h.note && <span className="text-slate-500">· {h.note}</span>}
                <span className="ml-auto text-slate-400">{clock(h.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {canAct && (
        <button
          type="button"
          onClick={act}
          disabled={busy}
          className={cx('mt-3 w-full rounded-xl py-3 text-[15px] font-bold text-white disabled:opacity-50',
            next === '완료' ? 'bg-emerald-600 active:bg-emerald-700' : task.urgent ? 'bg-red-600 active:bg-red-700' : 'bg-blue-600 active:bg-blue-700')}
        >
          {NEXT_LABEL[next!]}
        </button>
      )}
    </article>
  );
}

type Filter = 'received' | 'sent' | 'all';

export default function TaskBoard({ tasks, me, onError }: { tasks: Task[]; me: Staff; onError: (m: string) => void }) {
  const [filter, setFilter] = useState<Filter>(me.role === 'manager' ? 'all' : 'received');
  const [showDone, setShowDone] = useState(false);

  const scoped = tasks.filter(t => filter === 'all' || (filter === 'received' ? t.toDept === me.dept : t.createdBy.id === me.id));
  const open = scoped.filter(t => t.status !== '완료').sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.createdAt - b.createdAt);
  const done = scoped.filter(t => t.status === '완료').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30);

  const tabs: [Filter, string][] = [['received', '받은 요청'], ['sent', '내가 보낸 요청'], ['all', '전체']];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={cx('flex-1 rounded-lg py-2 text-sm font-semibold', filter === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600')}>
            {label}
          </button>
        ))}
      </div>

      {open.length ? open.map(t => <TaskCard key={t.id} task={t} me={me} onError={onError} />) : <Empty>처리할 요청이 없습니다 👍</Empty>}

      {done.length > 0 && (
        <div className="space-y-3">
          <button onClick={() => setShowDone(s => !s)} className="text-sm font-semibold text-slate-500">
            완료된 요청 {done.length}건 {showDone ? '접기' : '보기'}
          </button>
          {showDone && done.map(t => <TaskCard key={t.id} task={t} me={me} onError={onError} />)}
        </div>
      )}
    </div>
  );
}
