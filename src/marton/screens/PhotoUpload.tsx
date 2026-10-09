import { useRef, useState, type FormEvent } from 'react';
import { Camera, Image as ImageIcon, Send, Siren, X } from 'lucide-react';
import { DEPARTMENTS, MAX_TASK_PHOTOS, type Department, type Staff, type Task, type TaskCategory } from '../shared';
import { fileToJpeg } from '../camera';
import { send } from '../outbox';
import { Chip, cx, inputCls, primaryBtn } from '../ui';
import CameraView from './CameraView';

// 사진으로 알리는 일이 많은 유형만 (요청 탭과 같은 유형 이름을 쓴다)
const KINDS: { category: TaskCategory; label: string; title: string; detail: string }[] = [
  { category: '바코드 훼손/미인식', label: '🔖 바코드 훼손', title: '바코드 훼손/미인식 신고', detail: '사진의 바코드가 읽히지 않습니다. 바코드 재부착 부탁드립니다.' },
  { category: '가격 오류', label: '🏷️ 가격 오류', title: '가격표 오류 확인', detail: '사진의 가격표와 계산 가격이 다릅니다. 확인 부탁드립니다.' },
  { category: '재고/보충', label: '📦 진열·보충', title: '진열·보충 요청', detail: '사진 위치의 진열·재고 확인 부탁드립니다.' },
  { category: '행사상품 확인', label: '🎉 행사 확인', title: '행사상품 확인 요청', detail: '사진의 행사 내용 확인 부탁드립니다.' },
  { category: '기타', label: '📝 기타', title: '사진 확인 요청', detail: '' },
];

/** 사진 올리기: 찍거나 앨범에서 골라 바로 담당 부서에 보낸다 */
export default function PhotoUpload({ me, onSent, onError }: { me: Staff; onSent: (t: Task | null) => void; onError: (m: string) => void }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [camera, setCamera] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number] | null>(null);
  const [toDept, setToDept] = useState<Department | ''>('');
  const [location, setLocation] = useState('');
  const [memo, setMemo] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const albumRef = useRef<HTMLInputElement>(null);
  const room = MAX_TASK_PHOTOS - photos.length;

  const add = (list: string[]) => setPhotos(p => [...p, ...list].slice(0, MAX_TASK_PHOTOS));

  const pickAlbum = async (files: FileList | null) => {
    if (!files?.length) return;
    const chosen = [...files].filter(f => f.type.startsWith('image/')).slice(0, room);
    if (files.length > room) onError(`사진은 최대 ${MAX_TASK_PHOTOS}장까지 올릴 수 있어 ${chosen.length}장만 넣었습니다.`);
    try {
      add(await Promise.all(chosen.map(f => fileToJpeg(f))));
    } catch {
      onError('사진을 읽지 못했습니다. 다른 사진을 골라 주세요.');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!photos.length) return onError('사진을 한 장 이상 올려 주세요.');
    if (!kind || !toDept) return onError('무슨 일인지와 받는 부서를 골라 주세요.');
    setBusy(true);
    try {
      const detail = [memo.trim(), kind.detail].filter(Boolean).join('\n');
      const task = await send<Task>('/tasks', { toDept, category: kind.category, title: kind.title, detail, location, urgent, photos }, `사진: ${kind.title}`);
      setPhotos([]); setKind(null); setToDept(''); setLocation(''); setMemo(''); setUrgent(false);
      onSent(task);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-700">1. 사진 <span className="font-normal text-slate-400">(최대 {MAX_TASK_PHOTOS}장)</span></span>
          <span className="text-xs font-semibold text-slate-500">{photos.length} / {MAX_TASK_PHOTOS}</span>
        </div>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-slate-200">
                <img src={src} alt={`올릴 사진 ${i + 1}`} className="size-full object-cover" />
                <button type="button" onClick={() => setPhotos(p => p.filter((_, k) => k !== i))} aria-label={`사진 ${i + 1} 빼기`} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="size-4" /></button>
              </div>
            ))}
          </div>
        )}
        {room > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setCamera(true)} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-blue-600 py-5 text-[15px] font-bold text-white active:bg-blue-700">
              <Camera className="size-6" />카메라로 찍기
            </button>
            <button type="button" onClick={() => albumRef.current?.click()} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-blue-200 bg-white py-5 text-[15px] font-bold text-blue-700 active:bg-blue-50">
              <ImageIcon className="size-6" />앨범에서 고르기
            </button>
          </div>
        )}
        <input ref={albumRef} type="file" accept="image/*" multiple hidden onChange={e => { void pickAlbum(e.target.files); e.target.value = ''; }} />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">2. 무슨 일인가요?</span>
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map(k => (
            <button key={k.category} type="button" onClick={() => setKind(k)} aria-pressed={kind?.category === k.category}
              className={cx('rounded-xl border px-3 py-3 text-left text-sm font-semibold', kind?.category === k.category ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-800')}>
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">3. 받는 부서</span>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.filter(d => d !== me.dept).map(d => <Chip key={d} active={toDept === d} onClick={() => setToDept(d)}>{d}</Chip>)}
        </div>
      </div>

      <input className={inputCls} value={location} onChange={e => setLocation(e.target.value)} placeholder="위치 (예: 3번 계산대, 가공 B열 2단)" maxLength={60} />
      <textarea className={cx(inputCls, 'min-h-20')} value={memo} onChange={e => setMemo(e.target.value)} placeholder="메모 (선택, 예: 손님 계산 대기 중)" maxLength={300} />

      <button type="button" onClick={() => setUrgent(u => !u)}
        className={cx('flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3 text-[15px] font-bold', urgent ? 'border-red-600 bg-red-600 text-white' : 'border-red-200 bg-white text-red-600')}>
        <Siren className="size-5" />{urgent ? '긴급 (호출음 반복 + 진동)' : '긴급으로 보내기'}
      </button>

      <button className={cx(primaryBtn, 'flex items-center justify-center gap-2')} disabled={busy || !photos.length || !kind || !toDept}>
        <Send className="size-4" />{busy ? '보내는 중…' : !photos.length ? '사진을 먼저 올려 주세요' : `${toDept || '부서'}에 사진 보내기`}
      </button>

      {camera && (
        <CameraView mode="photo" onClose={() => setCamera(false)} onCapture={photo => { setCamera(false); add([photo]); }} />
      )}
    </form>
  );
}
