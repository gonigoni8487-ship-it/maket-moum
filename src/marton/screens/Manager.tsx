import { Mic, MicOff } from 'lucide-react';
import { useDictation } from '../dictation';
import { useState, type FormEvent } from 'react';
import { BROADCAST_TITLE, DEPARTMENTS, meetingTitle, type Department, type Handover, type Notice, type Staff, type StoreSound, type Task } from '../shared';
import { api } from '../api';
import { TaskCard } from './TaskBoard';
import { NoticeCard } from './Notices';
import { HandoverList } from './Handover';
import InviteQR from './InviteQR';
import CouponSend from './CouponSend';
import SoundSettings from './SoundSettings';
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

/** 말로 입력 버튼: 누르고 말하면 내용 칸에 글자로 들어간다 */
function DictateButton({ d }: { d: ReturnType<typeof useDictation> }) {
  return (
    <div className="space-y-1.5">
      <button type="button" onClick={d.listening ? d.stop : d.start}
        className={cx('flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-bold text-white', d.listening ? 'bg-red-600 motion-safe:animate-pulse' : 'bg-slate-800')}>
        {d.listening ? <><MicOff className="size-5" />말하는 중… 끝나면 눌러 주세요</> : <><Mic className="size-5" />말로 입력</>}
      </button>
      {d.interim && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{d.interim}</p>}
      {d.problem && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{d.problem}</p>}
    </div>
  );
}

export default function Manager({ me, tasks, notices, handovers, online, sounds, onError, onToast }: {
  me: Staff; tasks: Task[]; notices: Notice[]; handovers: Handover[]; online: Record<string, number>; sounds: StoreSound[]; onError: (m: string) => void; onToast: (m: string) => void;
}) {
  // 받는 파트 (비어 있으면 전체)
  const [targets, setTargets] = useState<Department[]>([]);
  const targetLabel = targets.length ? targets.join('·') : '전체';
  const toggleTarget = (d: Department) => setTargets(t => (t.includes(d) ? t.filter(x => x !== d) : [...t, d]));
  const dictation = useDictation(text => setBody(b => (b ? `${b} ${text}` : text)));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  // 지시사항 종류: 일반 공지 / 전체 공지 방송 / 금일 중회
  const [kind, setKind] = useState<'order' | 'broadcast' | 'meeting'>('order');

  const [meetHour, setMeetHour] = useState(() => Math.min(22, new Date().getHours() + 1));
  const [meetMinute, setMeetMinute] = useState(0);

  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const today = tasks.filter(t => t.createdAt >= startOfDay);
  const open = tasks.filter(t => t.status !== '완료');
  const urgentOpen = open.filter(t => t.urgent).sort((a, b) => a.createdAt - b.createdAt);
  const overall = avg(today.map(t => (at(t, '확인') ?? 0) - t.createdAt).filter(x => x > 0));

  const post = async (e: FormEvent) => {
    e.preventDefault();
    dictation.stop();
    setBusy(true);
    try {
      await api('/notices', {
        scope: kind === 'broadcast' || !targets.length ? 'all' : targets[0], depts: kind === 'broadcast' ? [] : targets,
        title: kind === 'order' ? title.trim() : kind, body, urgent: kind === 'order' && urgent,
        kind, meetingHour: meetHour, meetingMinute: meetMinute
      });
      setTitle(''); setBody(''); setUrgent(false);
      onToast(kind === 'broadcast' ? '전체 공지 방송을 보냈습니다. 모든 직원 휴대폰에서 음성으로 안내됩니다.'
        : kind === 'meeting' ? `${meetingTitle(meetHour, meetMinute)} — 보냈습니다. 10분 전에 다시 알립니다.`
        : `${targetLabel}에 지시사항을 보냈습니다. 받는 직원 휴대폰에서 음성으로 안내됩니다.`);
      setKind('order');
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
      <Section title="점장·부점장 지시사항">
        <form onSubmit={post} className="space-y-3 rounded-2xl bg-white p-4">
          <div className="grid grid-cols-3 gap-2 text-sm font-bold">
            {([['order', '📝 지시사항'], ['broadcast', '📢 전체 공지 방송'], ['meeting', '🕑 금일 중회']] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
                className={cx('rounded-xl border px-2 py-3', kind === k ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700')}>
                {label}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500">📊 실적 공유 · 📅 근무계획 · ⏰ 소비기한 점검은 <b>공지 탭</b>에서 올립니다.</p>

          {kind !== 'broadcast' && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">받는 파트 (여러 개 선택 가능)</span>
              <div className="flex flex-wrap gap-2">
                <Chip active={!targets.length} onClick={() => setTargets([])}>전체</Chip>
                {DEPARTMENTS.map(d => <Chip key={d} active={targets.includes(d)} onClick={() => toggleTarget(d)}>{d}</Chip>)}
              </div>
            </div>
          )}

          {kind === 'broadcast' && (
            <>
              <p className="rounded-xl bg-blue-50 px-3.5 py-2.5 text-sm font-bold text-blue-800">📢 {BROADCAST_TITLE}</p>
              <DictateButton d={dictation} />
              <textarea className={cx(inputCls, 'min-h-24')} value={body} onChange={e => setBody(e.target.value)} placeholder="방송 내용 (말하거나 입력, 예: 15시부터 우천으로 입구 매트 교체 바랍니다)" maxLength={1000} />
              <p className="text-xs text-slate-500">모든 직원 휴대폰에서 호출음 뒤에 "{BROADCAST_TITLE}. (내용)"을 음성으로 읽어 줍니다.</p>
            </>
          )}

          {kind === 'meeting' && (
            <>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm font-bold text-slate-700">금일</span>
                <select aria-label="시" className={cx(inputCls, 'min-w-0 flex-1')} value={meetHour} onChange={e => setMeetHour(Number(e.target.value))}>
                  {Array.from({ length: 18 }, (_, i) => i + 6).map(h => <option key={h} value={h}>{h}시</option>)}
                </select>
                <select aria-label="분" className={cx(inputCls, 'min-w-0 flex-1')} value={meetMinute} onChange={e => setMeetMinute(Number(e.target.value))}>
                  {[0, 10, 20, 30, 40, 50].map(m => <option key={m} value={m}>{m ? `${m}분` : '정각'}</option>)}
                </select>
                <span className="shrink-0 text-sm font-bold text-slate-700">중회</span>
              </div>
              <p className="rounded-xl bg-blue-50 px-3.5 py-2.5 text-sm font-bold text-blue-800">🕑 {meetingTitle(meetHour, meetMinute)}</p>
              <input className={inputCls} value={body} onChange={e => setBody(e.target.value)} placeholder="장소·내용 (선택, 예: 장소는 3층 회의실입니다)" maxLength={200} />
              <p className="text-xs text-slate-500">보낼 때 한 번, 중회 10분 전에 한 번 더 음성으로 알립니다.</p>
            </>
          )}

          {kind === 'order' && (
            <>
              <DictateButton d={dictation} />
              <textarea className={cx(inputCls, 'min-h-28')} value={body} onChange={e => setBody(e.target.value)} placeholder="지시사항 (말하거나 입력, 예: 오후 3시까지 행사 매대 가격표 교체 완료 바랍니다)" maxLength={1000} />
              <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="제목 (선택 · 비우면 내용 앞부분)" maxLength={80} />
              <p className="text-xs text-slate-500">받는 파트 직원 휴대폰에서 호출음 뒤에 "{me.title || '점장'}님 지시사항입니다. (내용)"을 음성으로 읽어 줍니다.</p>
              <label className="flex items-center gap-2 text-sm font-semibold text-red-600">
                <input type="checkbox" className="size-5 accent-red-600" checked={urgent} onChange={e => setUrgent(e.target.checked)} />긴급 (확인할 때까지 경보음)
              </label>
            </>
          )}


          <button className={primaryBtn} disabled={busy || (kind === 'order' && !title.trim() && !body.trim()) || (kind === 'broadcast' && !body.trim())}>
            {kind === 'broadcast' ? '전체 공지 방송 보내기' : kind === 'meeting' ? `${targetLabel}에 중회 알리기` : `${targetLabel}에 지시사항 보내기`}
          </button>
        </form>
      </Section>

      <CouponSend onError={onError} onToast={onToast} />

      <SoundSettings sounds={sounds} myName={me.name} myDept={me.dept} onError={onError} onToast={onToast} />

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

      <HandoverList handovers={handovers} me={me} onError={onError} />

      <InviteQR onToast={onToast} />

      <Section title="보낸 공지">
        {notices.length ? [...notices].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10).map(n => <NoticeCard key={n.id} n={n} me={me} onError={onError} />) : <Empty>공지 없음</Empty>}
      </Section>
    </div>
  );
}
