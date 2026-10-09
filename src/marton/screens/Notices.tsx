import { Megaphone, Siren, Volume2 } from 'lucide-react';
import { noticeFor, noticeSpeech, noticeTarget, type ExpiryCheck, type Notice, type Staff, type WorkSchedule } from '../shared';
import SharePanel from './SharePanel';
import ScheduleCalendar from './ScheduleCalendar';
import ExpiryPanel from './ExpiryPanel';
import { speak } from '../alerts';
import { TaskPhotos } from './TaskBoard';
import { send } from '../outbox';
import { clock, cx, Empty } from '../ui';

export function NoticeCard({ n, me, onError }: { n: Notice; me: Staff; onError: (m: string) => void }) {
  const read = n.readBy.includes(me.id);
  const markRead = () => send(`/notices/${n.id}/read`, {}, `공지 확인: ${n.title}`).catch(e => onError(e.message));
  return (
    <article className={cx('rounded-2xl border bg-white p-4', n.urgent ? 'border-red-300' : 'border-slate-200', !read && 'ring-2 ring-blue-100')}>
      <div className="flex items-center gap-1.5 text-xs">
        {n.urgent ? <Siren className="size-3.5 text-red-600" /> : <Megaphone className="size-3.5 text-blue-600" />}
        <span className="font-bold text-slate-700">{n.kind === 'broadcast' ? '전체 공지 방송' : n.kind === 'meeting' ? `중회 · ${noticeTarget(n)}` : n.kind === 'order' ? `${n.byTitle || '점장'}님 지시사항 · ${noticeTarget(n)}` : n.kind === 'share' ? `실적 공유 · ${noticeTarget(n)}` : `${noticeTarget(n)} 공지`}</span>
        <span className="text-slate-400">{n.by.name} · {new Date(n.createdAt).toLocaleDateString('ko-KR')} {clock(n.createdAt)}</span>
      </div>
      <h3 className="mt-1.5 font-bold text-slate-900">{n.title}</h3>
      {n.body && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>}
      {n.photos?.length ? <div className="mt-2"><TaskPhotos ids={n.photos} size="size-28" /></div> : null}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-2">
          읽음 {n.readBy.length}명
          {noticeSpeech(n) && <button onClick={() => speak(noticeSpeech(n)!)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 font-bold text-slate-700"><Volume2 className="size-3.5" />다시 듣기</button>}
        </span>
        {!read && <button onClick={markRead} className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white">확인했습니다</button>}
      </div>
    </article>
  );
}

export type BoardSection = 'notice' | 'share' | 'schedule' | 'expiry';
const SECTIONS: [BoardSection, string][] = [['notice', '공지'], ['share', '실적 공유'], ['schedule', '근무표'], ['expiry', '소비기한']];

/** 공지 탭: 공지 · 실적 공유 · 근무 캘린더 · 소비기한 점검 */
export default function Notices({ notices, schedules, expiryChecks, me, aiEnabled, section, onSection, onError, onToast }: {
  notices: Notice[]; schedules: WorkSchedule[]; expiryChecks: ExpiryCheck[]; me: Staff; aiEnabled: boolean;
  section: BoardSection; onSection: (s: BoardSection) => void; onError: (m: string) => void; onToast: (m: string) => void;
}) {
  const mine = notices.filter(n => n.kind !== 'share' && noticeFor(n, me.dept)).sort((a, b) => b.createdAt - a.createdAt);
  const unreadShare = notices.filter(n => n.kind === 'share' && noticeFor(n, me.dept) && !n.readBy.includes(me.id)).length;
  const openChecks = expiryChecks.filter(c => !c.doneAt && (c.dept === me.dept || me.role === 'manager') && c.at <= Date.now() + 24 * 3600000).length;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-200/70 p-1">
        {SECTIONS.map(([k, label]) => (
          <button key={k} onClick={() => onSection(k)} className={cx('relative rounded-lg py-2 text-sm font-semibold', section === k ? 'bg-white shadow-sm' : 'text-slate-600')}>
            {label}
            {k === 'share' && unreadShare > 0 && <span className="absolute -right-0.5 -top-1 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadShare}</span>}
            {k === 'expiry' && openChecks > 0 && <span className="absolute -right-0.5 -top-1 grid min-w-4 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">{openChecks}</span>}
          </button>
        ))}
      </div>
      {section === 'notice' && (mine.length ? mine.map(n => <NoticeCard key={n.id} n={n} me={me} onError={onError} />) : <Empty>공지가 없습니다.</Empty>)}
      {section === 'share' && <SharePanel notices={notices} me={me} aiEnabled={aiEnabled} onError={onError} onToast={onToast} />}
      {section === 'schedule' && <ScheduleCalendar schedules={schedules} me={me} aiEnabled={aiEnabled} onError={onError} onToast={onToast} />}
      {section === 'expiry' && <ExpiryPanel checks={expiryChecks} me={me} onError={onError} onToast={onToast} />}
    </div>
  );
}
