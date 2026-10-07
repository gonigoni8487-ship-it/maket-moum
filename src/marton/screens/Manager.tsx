import { useState, type FormEvent } from 'react';
import { DEPARTMENTS, type Department, type Notice, type Staff, type Task } from '../shared';
import { api } from '../api';
import { TaskCard } from './TaskBoard';
import { NoticeCard } from './Notices';
import { Chip, cx, elapsed, Empty, inputCls, primaryBtn, Section } from '../ui';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt = (ms: number | null) => (ms === null ? '-' : elapsed(0, ms));
const at = (t: Task, s: Task['status']) => t.history.find(h => h.status === s)?.at;

function deptStats(tasks: Task[], dept: Department) {
  const mine = tasks.filter(t => t.toDept === dept);
  const ack = mine.map(t => (at(t, '확인') ?? 0) - t.createdAt).filter(x => x > 0);
  const done = mine.map(t => (at(t, '완료') ?? 0) - t.createdAt).filter(x => x > 0);
  return {
    open: mine.filter(t => t.status !== '완료').length,
    urgentOpen: mine.filter(t => t.urgent && t.status !== '완료').length,
    ack: avg(ack),
    done: avg(done),
  };
}

export default function Manager({ me, tasks, notices, online, onError, onToast }: {
  me: Staff; tasks: Task[]; notices: Notice[]; online: Record<string, number>; onError: (m: string) => void; onToast: (m: string) => void;
}) {
  const [scope, setScope] = useState<'all' | Department>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);

  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const today = tasks.filter(t => t.createdAt >= startOfDay);
  const open = tasks.filter(t => t.status !== '완료');
  const urgentOpen = open.filter(t => t.urgent).sort((a, b) => a.createdAt - b.createdAt);
  const overall = avg(today.map(t => (at(t, '확인') ?? 0) - t.createdAt).filter(x => x > 0));

  const post = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/notices', { scope, title, body, urgent });
      setTitle(''); setBody(''); setUrgent(false);
      onToast('공지를 보냈습니다.');
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const kpis: [string, string, boolean?][] = [
    ['미처리', `${open.length}건`],
    ['긴급 미처리', `${urgentOpen.length}건`, urgentOpen.length > 0],
    ['오늘 완료', `${today.filter(t => t.status === '완료').length}/${today.length}건`],
    ['평균 확인', fmt(overall)],
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2">
        {kpis.map(([label, value, alarm]) => (
          <div key={label} className={cx('rounded-2xl p-3.5', alarm ? 'bg-red-600 text-white' : 'bg-white')}>
            <div className={cx('text-xs font-semibold', alarm ? 'text-red-100' : 'text-slate-500')}>{label}</div>
            <div className="mt-0.5 text-xl font-black">{value}</div>
          </div>
        ))}
      </div>

      <Section title="긴급 요청">
        {urgentOpen.length ? urgentOpen.map(t => <TaskCard key={t.id} task={t} me={me} onError={onError} />) : <Empty>긴급 요청 없음</Empty>}
      </Section>

      <Section title="부서별 처리속도" right={<span className="text-xs text-slate-400">최근 7일 · 접수 기준</span>}>
        <div className="overflow-hidden rounded-2xl bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr><th className="px-3 py-2 text-left">부서</th><th>접속</th><th>미처리</th><th>평균 확인</th><th>평균 완료</th></tr>
            </thead>
            <tbody>
              {DEPARTMENTS.map(d => {
                const s = deptStats(tasks, d);
                return (
                  <tr key={d} className="border-t border-slate-100 text-center">
                    <td className="px-3 py-2.5 text-left font-semibold">{d}</td>
                    <td className={online[d] ? 'text-emerald-600 font-bold' : 'text-slate-300'}>{online[d] || 0}</td>
                    <td className={cx(s.urgentOpen && 'font-bold text-red-600')}>{s.open}</td>
                    <td>{fmt(s.ack)}</td>
                    <td>{fmt(s.done)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="미처리 업무">
        {open.filter(t => !t.urgent).length
          ? open.filter(t => !t.urgent).sort((a, b) => a.createdAt - b.createdAt).map(t => <TaskCard key={t.id} task={t} me={me} onError={onError} />)
          : <Empty>미처리 업무 없음</Empty>}
      </Section>

      <Section title="공지 보내기">
        <form onSubmit={post} className="space-y-3 rounded-2xl bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <Chip active={scope === 'all'} onClick={() => setScope('all')}>전체</Chip>
            {DEPARTMENTS.map(d => <Chip key={d} active={scope === d} onClick={() => setScope(d)}>{d}</Chip>)}
          </div>
          <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="공지 제목" maxLength={80} />
          <textarea className={cx(inputCls, 'min-h-20')} value={body} onChange={e => setBody(e.target.value)} placeholder="내용" maxLength={1000} />
          <label className="flex items-center gap-2 text-sm font-semibold text-red-600">
            <input type="checkbox" className="size-5 accent-red-600" checked={urgent} onChange={e => setUrgent(e.target.checked)} />긴급 공지 (사이렌 알림)
          </label>
          <button className={primaryBtn} disabled={busy || !title.trim()}>{scope === 'all' ? '전체' : scope} 공지 보내기</button>
        </form>
      </Section>

      <Section title="보낸 공지">
        {notices.length ? [...notices].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10).map(n => <NoticeCard key={n.id} n={n} me={me} onError={onError} />) : <Empty>공지 없음</Empty>}
      </Section>
    </div>
  );
}
