import { useEffect, useState, type FormEvent } from 'react';
import { Siren, Send, Mic, Camera, X } from 'lucide-react';
import { DEPARTMENTS, MAX_TASK_PHOTOS, TASK_CATEGORIES, type Department, type Staff, type Task, type TaskCategory } from '../shared';
import { send } from '../outbox';
import { Chip, cx, inputCls, primaryBtn, type Draft } from '../ui';
import CameraView from './CameraView';

// 고객센터에서 가장 많이 쓰는 요청을 원터치로
const QUICK: { label: string; draft: Draft }[] = [
  { label: '🐟 수산 고객응대', draft: { toDept: '수산', category: '고객응대 요청', title: '수산 고객응대 요청' } },
  { label: '🥩 축산 고객응대', draft: { toDept: '축산', category: '고객응대 요청', title: '축산 고객응대 요청' } },
  { label: '📍 상품 위치 확인', draft: { category: '상품 위치 확인', title: '상품 위치 확인 요청' } },
  { label: '🏷️ 가격 오류', draft: { category: '가격 오류', title: '가격표 오류 확인' } },
  { label: '🔖 바코드 훼손', draft: { category: '바코드 훼손/미인식', title: '바코드 훼손/미인식 신고' } },
  { label: '🎉 행사상품 확인', draft: { category: '행사상품 확인', title: '행사상품 확인 요청' } },
  { label: '📦 재고/보충', draft: { category: '재고/보충', title: '상품 보충 요청' } },
];

export default function RequestForm({ me, draft, onSent, onError, onVoice }: { me: Staff; draft: Draft | null; onSent: (t: Task | null) => void; onError: (m: string) => void; onVoice: () => void }) {
  const [toDept, setToDept] = useState<Department | ''>('');
  const [category, setCategory] = useState<TaskCategory | ''>('');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [location, setLocation] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [camera, setCamera] = useState(false);

  const apply = (d: Draft) => {
    if (d.toDept) setToDept(d.toDept);
    if (d.category) setCategory(d.category);
    if (d.title !== undefined) setTitle(d.title);
    if (d.detail !== undefined) setDetail(d.detail);
    if (d.location !== undefined) setLocation(d.location);
    if (d.urgent !== undefined) setUrgent(d.urgent);
    if (d.photos) setPhotos(d.photos.slice(0, MAX_TASK_PHOTOS));
  };
  useEffect(() => { if (draft) apply(draft); }, [draft]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const task = await send<Task>('/tasks', { toDept, category, title, detail, location, urgent, photos }, `요청: ${title || `${toDept} ${category}`}`);
      setTitle(''); setDetail(''); setLocation(''); setUrgent(false); setPhotos([]);
      onSent(task);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <button type="button" onClick={onVoice} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-[16px] font-black text-white active:bg-red-700">
        <Mic className="size-5" />말로 요청하기
      </button>

      <div className="grid grid-cols-2 gap-2">
        {QUICK.map(q => (
          <button key={q.label} type="button" onClick={() => apply(q.draft)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-semibold text-slate-800 active:bg-slate-100">
            {q.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">받는 부서</span>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.filter(d => d !== me.dept).map(d => <Chip key={d} active={toDept === d} onClick={() => setToDept(d)}>{d}</Chip>)}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">요청 유형</span>
        <div className="flex flex-wrap gap-2">
          {TASK_CATEGORIES.map(c => <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>)}
        </div>
      </div>

      <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="제목 (예: 수산 고객응대 요청)" maxLength={60} />
      <input className={inputCls} value={location} onChange={e => setLocation(e.target.value)} placeholder="위치 (예: 고객센터 앞, 3번 계산대)" maxLength={60} />
      <textarea className={cx(inputCls, 'min-h-24')} value={detail} onChange={e => setDetail(e.target.value)} placeholder="내용 (예: 고객님이 회 손질 문의하십니다)" maxLength={500} />

      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">사진 첨부 <span className="font-normal text-slate-400">(가격표·바코드·상품, 최대 {MAX_TASK_PHOTOS}장)</span></span>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-slate-200">
                <img src={src} alt={`첨부 사진 ${i + 1}`} className="size-full object-cover" />
                <button type="button" onClick={() => setPhotos(p => p.filter((_, k) => k !== i))} aria-label="사진 빼기" className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="size-4" /></button>
              </div>
            ))}
          </div>
        )}
        {photos.length < MAX_TASK_PHOTOS && (
          <button type="button" onClick={() => setCamera(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-600 bg-white py-3.5 text-[15px] font-bold text-blue-700 active:bg-blue-50">
            <Camera className="size-5" />사진 찍기 · 앨범에서 고르기 ({photos.length}/{MAX_TASK_PHOTOS})
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setUrgent(u => !u)}
        className={cx('flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3 text-[15px] font-bold',
          urgent ? 'border-red-600 bg-red-600 text-white' : 'border-red-200 bg-white text-red-600')}
      >
        <Siren className="size-5" />{urgent ? '긴급 요청 (경보음 + 진동 반복)' : '긴급으로 보내기'}
      </button>

      <button className={cx(primaryBtn, 'flex items-center justify-center gap-2')} disabled={busy || !toDept || !category}>
        <Send className="size-4" />{busy ? '보내는 중…' : `${toDept || '부서'}에 요청 보내기`}
      </button>
      {camera && (
        <CameraView mode="photo" onClose={() => setCamera(false)} onCapture={photo => { setCamera(false); setPhotos(p => [...p, photo].slice(0, MAX_TASK_PHOTOS)); }} />
      )}
    </form>
  );
}
