import { Megaphone, Siren } from 'lucide-react';
import type { Notice, Staff } from '../shared';
import { api } from '../api';
import { clock, cx, Empty } from '../ui';

export function NoticeCard({ n, me, onError }: { n: Notice; me: Staff; onError: (m: string) => void }) {
  const read = n.readBy.includes(me.id);
  const markRead = () => api(`/notices/${n.id}/read`, {}).catch(e => onError(e.message));
  return (
    <article className={cx('rounded-2xl border bg-white p-4', n.urgent ? 'border-red-300' : 'border-slate-200', !read && 'ring-2 ring-blue-100')}>
      <div className="flex items-center gap-1.5 text-xs">
        {n.urgent ? <Siren className="size-3.5 text-red-600" /> : <Megaphone className="size-3.5 text-blue-600" />}
        <span className="font-bold text-slate-700">{n.scope === 'all' ? '전체공지' : `${n.scope} 공지`}</span>
        <span className="text-slate-400">{n.by.name} · {new Date(n.createdAt).toLocaleDateString('ko-KR')} {clock(n.createdAt)}</span>
      </div>
      <h3 className="mt-1.5 font-bold text-slate-900">{n.title}</h3>
      {n.body && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>읽음 {n.readBy.length}명</span>
        {!read && <button onClick={markRead} className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white">확인했습니다</button>}
      </div>
    </article>
  );
}

export default function Notices({ notices, me, onError }: { notices: Notice[]; me: Staff; onError: (m: string) => void }) {
  const mine = notices.filter(n => n.scope === 'all' || n.scope === me.dept).sort((a, b) => b.createdAt - a.createdAt);
  return <div className="space-y-3">{mine.length ? mine.map(n => <NoticeCard key={n.id} n={n} me={me} onError={onError} />) : <Empty>공지가 없습니다.</Empty>}</div>;
}
