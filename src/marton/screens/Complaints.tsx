import { useRef, useState } from 'react';
import { Camera, CheckCircle2, HeartHandshake, ImagePlus, Pencil, Plus, Send, X } from 'lucide-react';
import {
  COMPLAINT_STATUSES, DEPARTMENTS, MAX_COMPLAINT_PHOTOS, canEditComplaint,
  type Complaint, type ComplaintStatus, type Department, type Staff,
} from '../shared';
import { api } from '../api';
import { send } from '../outbox';
import { fileToJpeg } from '../camera';
import { useDictation } from '../dictation';
import { Chip, clock, cx, Empty, inputCls, primaryBtn } from '../ui';
import { TaskPhotos } from './TaskBoard';
import { DictateButton } from './Manager';
import CameraView from './CameraView';

const STATUS_STYLE: Record<ComplaintStatus, string> = {
  접수: 'bg-amber-100 text-amber-800',
  처리중: 'bg-violet-100 text-violet-800',
  처리완료: 'bg-emerald-100 text-emerald-800',
};
const COMPENSATION_CHIPS = ['보상 없음', '상품 교환', '환불', '상품권', '사은품 증정'];

type Form = { content: string; action: string; compensation: string; assignee: string; depts: Department[]; status: ComplaintStatus };
const empty = (me: Staff): Form => ({ content: '', action: '', compensation: '', assignee: me.name, depts: [], status: '접수' });

/** 사진 첨부 칸: 카메라로 찍기 · 앨범에서 고르기 */
function PhotoPicker({ photos, setPhotos, max, onError }: { photos: string[]; setPhotos: (f: (p: string[]) => string[]) => void; max: number; onError: (m: string) => void }) {
  const [camera, setCamera] = useState(false);
  const albumRef = useRef<HTMLInputElement>(null);
  const room = max - photos.length;
  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].filter(f => f.type.startsWith('image/')).slice(0, room);
    if (files.length > room) onError(`사진은 ${max}장까지 올릴 수 있습니다.`);
    try { const out = await Promise.all(list.map(f => fileToJpeg(f))); setPhotos(p => [...p, ...out].slice(0, max)); }
    catch { onError('사진을 읽지 못했습니다. 다른 사진을 골라 주세요.'); }
  };
  return (
    <div className="space-y-2">
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((src, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-slate-200">
              <img src={src} alt={`첨부 사진 ${i + 1}`} className="size-full object-cover" />
              <button type="button" onClick={() => setPhotos(p => p.filter((_, k) => k !== i))} aria-label={`사진 ${i + 1} 빼기`} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"><X className="size-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      {room > 0 && (
        <div className="grid grid-cols-2 gap-2 text-sm font-bold">
          <button type="button" onClick={() => setCamera(true)} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-3 text-white"><Camera className="size-4" />사진 찍기</button>
          <button type="button" onClick={() => albumRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white py-3 text-slate-700"><ImagePlus className="size-4" />앨범에서</button>
        </div>
      )}
      <input ref={albumRef} type="file" accept="image/*" multiple hidden onChange={e => { void pick(e.target.files); e.target.value = ''; }} />
      {camera && <CameraView mode="photo" onClose={() => setCamera(false)} onCapture={p => { setCamera(false); setPhotos(x => [...x, p].slice(0, max)); }} />}
    </div>
  );
}

function Label({ n, children, hint }: { n: number; children: string; hint?: string }) {
  return <span className="text-sm font-bold text-slate-800">{n}. {children}{hint && <span className="ml-1 font-normal text-slate-400">{hint}</span>}</span>;
}

/** 접수·수정 양식: 사진 / 해당 내용 / 처리 내용 / 보상 내용 / 담당자 / 전달 부서 */
function ComplaintForm({ me, initial, existingPhotos = 0, onSubmit, onCancel, onError, submitLabel }: {
  me: Staff; initial: Form; existingPhotos?: number; submitLabel: string;
  onSubmit: (f: Form, photos: string[]) => Promise<void>; onCancel: () => void; onError: (m: string) => void;
}) {
  const [f, setF] = useState<Form>(initial);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const contentDictation = useDictation(t => setF(x => ({ ...x, content: x.content ? `${x.content} ${t}` : t })));
  const actionDictation = useDictation(t => setF(x => ({ ...x, action: x.action ? `${x.action} ${t}` : t })));
  const toggle = (d: Department) => setF(x => ({ ...x, depts: x.depts.includes(d) ? x.depts.filter(y => y !== d) : [...x.depts, d] }));

  const submit = async () => {
    if (!f.content.trim()) return onError('해당 내용을 입력해 주세요.');
    if (!f.depts.length) return onError('전달할 부서를 골라 주세요.');
    contentDictation.stop(); actionDictation.stop();
    setBusy(true);
    try { await onSubmit(f, photos); } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <div className="space-y-2">
        <Label n={1} hint={`(선택, ${MAX_COMPLAINT_PHOTOS}장까지)`}>사진 첨부</Label>
        <PhotoPicker photos={photos} setPhotos={setPhotos} max={MAX_COMPLAINT_PHOTOS - existingPhotos} onError={onError} />
      </div>
      <div className="space-y-2">
        <Label n={2}>해당 내용</Label>
        <DictateButton d={contentDictation} />
        <textarea className={cx(inputCls, 'min-h-24')} value={f.content} onChange={e => setF({ ...f, content: e.target.value })} maxLength={1000}
          placeholder="고객이 불편했던 점 (예: 구매한 딸기 일부가 물러 있어 교환 요청)" />
        <p className="text-xs text-slate-400">고객 이름·전화번호 같은 개인정보는 적지 마세요.</p>
      </div>
      <div className="space-y-2">
        <Label n={3} hint="(나중에 채워도 됩니다)">처리 내용</Label>
        <DictateButton d={actionDictation} />
        <textarea className={cx(inputCls, 'min-h-20')} value={f.action} onChange={e => setF({ ...f, action: e.target.value })} maxLength={1000}
          placeholder="어떻게 처리했는지 (예: 사과드리고 새 상품으로 교환, 진열 상품 전체 점검)" />
      </div>
      <div className="space-y-2">
        <Label n={4}>보상 내용</Label>
        <div className="flex flex-wrap gap-1.5">
          {COMPENSATION_CHIPS.map(c => <Chip key={c} active={f.compensation === c} onClick={() => setF({ ...f, compensation: f.compensation === c ? '' : c })}>{c}</Chip>)}
        </div>
        <input className={inputCls} value={f.compensation} onChange={e => setF({ ...f, compensation: e.target.value })} maxLength={300} placeholder="직접 입력 (예: 상품권 1만원)" />
      </div>
      <div className="space-y-2">
        <Label n={5}>담당자</Label>
        <input className={inputCls} value={f.assignee} onChange={e => setF({ ...f, assignee: e.target.value })} maxLength={20} placeholder="처리한 직원 이름" />
      </div>
      <div className="space-y-2">
        <Label n={6} hint="(여러 곳 선택 가능)">전달 부서</Label>
        <div className="flex flex-wrap gap-2">{DEPARTMENTS.map(d => <Chip key={d} active={f.depts.includes(d)} onClick={() => toggle(d)}>{d}</Chip>)}</div>
      </div>
      <div className="space-y-2">
        <span className="text-sm font-bold text-slate-800">처리 상태</span>
        <div className="grid grid-cols-3 gap-2">
          {COMPLAINT_STATUSES.map(s => (
            <button key={s} type="button" onClick={() => setF({ ...f, status: s })} aria-pressed={f.status === s}
              className={cx('rounded-xl border-2 py-2.5 text-sm font-bold', f.status === s ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600')}>{s}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl bg-slate-100 py-3.5 font-bold text-slate-700">취소</button>
        <button type="button" onClick={submit} disabled={busy} className={cx(primaryBtn, 'col-span-2 flex items-center justify-center gap-2')}>
          <Send className="size-4" />{busy ? '보내는 중…' : f.depts.length ? `${f.depts.join('·')}에 ${submitLabel}` : submitLabel}
        </button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children?: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2 text-sm">
      <span className="font-bold text-slate-500">{label}</span>
      <span className={cx('whitespace-pre-wrap', children ? 'text-slate-900' : 'text-slate-400')}>{children || '아직 없음'}</span>
    </div>
  );
}

function ComplaintCard({ c, me, onError, onToast }: { c: Complaint; me: Staff; onError: (m: string) => void; onToast: (m: string) => void }) {
  const [editing, setEditing] = useState(false);
  const unread = c.depts.includes(me.dept) && !c.readBy.includes(me.id);
  const markRead = () => send(`/complaints/${c.id}/read`, {}, '컴플레인 확인').catch(e => onError((e as Error).message));

  if (editing) {
    return (
      <ComplaintForm me={me} submitLabel="처리 내용 저장" existingPhotos={c.photos?.length ?? 0} onError={onError} onCancel={() => setEditing(false)}
        initial={{ content: c.content, action: c.action ?? '', compensation: c.compensation ?? '', assignee: c.assignee ?? me.name, depts: c.depts, status: c.status === '접수' && !c.action ? '처리중' : c.status }}
        onSubmit={async (f, photos) => { await api(`/complaints/${c.id}`, { ...f, photos }); setEditing(false); onToast('처리 내용을 저장했습니다.'); }} />
    );
  }
  return (
    <article className={cx('space-y-3 rounded-2xl border bg-white p-4', unread ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200')}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={cx('rounded-md px-2 py-0.5 font-bold', STATUS_STYLE[c.status])}>{c.status}</span>
        <span className="font-bold text-slate-700">→ {c.depts.join('·')}</span>
        <span className="text-slate-400">{c.by.dept} {c.by.name} · {new Date(c.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} {clock(c.createdAt)}</span>
      </div>
      {c.photos?.length ? <TaskPhotos ids={c.photos} size="size-24" /> : null}
      <div className="space-y-2 rounded-xl bg-slate-50 p-3">
        <Row label="해당 내용">{c.content}</Row>
        <Row label="처리 내용">{c.action}</Row>
        <Row label="보상 내용">{c.compensation}</Row>
        <Row label="담당자">{c.assignee}</Row>
        <Row label="전달 부서">{c.depts.join(', ')}</Row>
      </div>
      {c.updatedBy && c.updatedAt > c.createdAt && <p className="text-xs text-slate-400">최근 수정: {c.updatedBy.name} · {clock(c.updatedAt)}</p>}
      <div className="flex gap-2">
        {canEditComplaint(me, c) && (
          <button onClick={() => setEditing(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700"><Pencil className="size-4" />처리 내용 쓰기</button>
        )}
        {unread && <button onClick={markRead} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white"><CheckCircle2 className="size-4" />확인했습니다</button>}
      </div>
    </article>
  );
}

type Filter = 'all' | 'mine' | 'open' | 'done';

/** 도와드리겠습니다: 고객 컴플레인 접수건 공유 */
export default function Complaints({ complaints, me, onError, onToast }: { complaints: Complaint[]; me: Staff; onError: (m: string) => void; onToast: (m: string) => void }) {
  const [composing, setComposing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const sorted = [...complaints].sort((a, b) => b.createdAt - a.createdAt);
  const open = sorted.filter(c => c.status !== '처리완료');
  const list = filter === 'mine' ? sorted.filter(c => c.depts.includes(me.dept) || c.by.id === me.id)
    : filter === 'open' ? open : filter === 'done' ? sorted.filter(c => c.status === '처리완료') : sorted;
  const filters: [Filter, string][] = [['all', `전체 ${sorted.length}`], ['mine', `우리 부서`], ['open', `처리 중 ${open.length}`], ['done', '처리완료']];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 p-4 text-white">
        <HeartHandshake className="size-10 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-lg font-black">도와드리겠습니다</h2>
          <p className="text-xs text-white/90">고객 컴플레인 접수건을 공유하고, 처리·보상 내용을 함께 기록합니다.</p>
        </div>
      </div>

      {composing ? (
        <ComplaintForm me={me} initial={empty(me)} submitLabel="접수건 공유" onError={onError} onCancel={() => setComposing(false)}
          onSubmit={async (f, photos) => {
            const r = await send<Complaint>('/complaints', { ...f, photos }, '컴플레인 접수 공유');
            setComposing(false);
            onToast(r ? `${f.depts.join('·')}에 컴플레인 접수건을 공유했습니다.` : '연결되면 자동으로 공유합니다.');
          }} />
      ) : (
        <button onClick={() => setComposing(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 py-4 text-[16px] font-black text-white active:bg-rose-700">
          <Plus className="size-5" />컴플레인 접수 공유하기
        </button>
      )}

      <div className="flex flex-wrap gap-2">{filters.map(([k, label]) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{label}</Chip>)}</div>
      {list.length ? list.map(c => <ComplaintCard key={c.id} c={c} me={me} onError={onError} onToast={onToast} />) : <Empty>공유된 접수건이 없습니다.</Empty>}
    </div>
  );
}
