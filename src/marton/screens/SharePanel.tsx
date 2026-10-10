import { useRef, useState } from 'react';
import { FileText, ImagePlus, Loader2, Mic, MicOff, Paperclip, Sparkles, Volume2, X } from 'lucide-react';
import { DEPARTMENTS, MAX_FILE_BYTES, MAX_NOTICE_PHOTOS, noticeFor, noticeTarget, type Department, type Notice, type Staff } from '../shared';
import { api, session } from '../api';
import { send } from '../outbox';
import { speak } from '../alerts';
import { fileToJpeg } from '../camera';
import { useDictation } from '../dictation';
import { Chip, Examples, clock, cx, Empty, inputCls, primaryBtn } from '../ui';
import { photoUrl } from './TaskBoard';

const fileUrl = (id: string) => `/api/marton/files/${encodeURIComponent(id)}?token=${encodeURIComponent(session.token ?? '')}`;
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);
const readDataUrl = (f: File) => new Promise<string>((ok, fail) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = fail; r.readAsDataURL(f); });

type Pic = { src: string; caption: string; reading: boolean };
type Doc = { name: string; size: number; data: string };

/** 점장·부점장: 실적 공유 올리기 (사진마다 AI가 간단히 요약 → 고쳐서 올림) */
function ShareComposer({ me, aiEnabled, onError, onToast }: { me: Staff; aiEnabled: boolean; onError: (m: string) => void; onToast: (m: string) => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targets, setTargets] = useState<Department[]>([]);
  const [pics, setPics] = useState<Pic[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const picRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const dictation = useDictation(t => setBody(b => (b ? `${b} ${t}` : t)));
  const toggle = (d: Department) => setTargets(t => (t.includes(d) ? t.filter(x => x !== d) : [...t, d]));

  const addPics = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_NOTICE_PHOTOS - pics.length;
    const list = [...files].filter(f => f.type.startsWith('image/')).slice(0, room);
    if (files.length > room) onError(`사진은 ${MAX_NOTICE_PHOTOS}장까지 올릴 수 있습니다.`);
    for (const f of list) {
      let src: string;
      try { src = await fileToJpeg(f, 2000); } catch { onError('사진을 읽지 못했습니다.'); continue; }
      setPics(p => [...p, { src, caption: '', reading: aiEnabled }]);
      if (aiEnabled) {
        api<{ caption: string }>('/ai/caption', { image: src })
          .then(r => setPics(p => p.map(x => (x.src === src ? { ...x, caption: x.caption || r.caption, reading: false } : x))))
          .catch(() => setPics(p => p.map(x => (x.src === src ? { ...x, reading: false } : x))));
      }
    }
  };

  const addDocs = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of [...files].slice(0, 5 - docs.length)) {
      if (f.size > MAX_FILE_BYTES) { onError(`${f.name}: 파일이 너무 큽니다 (1.8MB까지). 사진으로 찍어 올려 주세요.`); continue; }
      if (!/\.(pdf|xlsx|xls|csv|docx|doc|pptx|ppt|hwp|hwpx|txt|zip)$/i.test(f.name)) { onError(`${f.name}: 올릴 수 없는 파일 형식입니다.`); continue; }
      setDocs(d => [...d, { name: f.name, size: f.size, data: '' }]);
      const data = await readDataUrl(f);
      setDocs(d => d.map(x => (x.name === f.name && !x.data ? { ...x, data } : x)));
    }
  };

  const total = pics.reduce((n, p) => n + p.src.length, 0) + docs.reduce((n, d) => n + d.data.length, 0);

  const submit = async () => {
    if (!title.trim() && !body.trim()) return onError('제목이나 내용을 입력해 주세요.');
    if (total > 7_000_000) return onError('첨부가 너무 큽니다. 사진이나 파일 수를 줄여 주세요.');
    dictation.stop();
    setBusy(true);
    try {
      await api('/notices', {
        kind: 'share', scope: targets.length ? targets[0] : 'all', depts: targets, title: title.trim(), body,
        photos: pics.map(p => p.src), photoCaptions: pics.map(p => p.caption), files: docs.filter(d => d.data).map(({ name, data }) => ({ name, data })),
      });
      setTitle(''); setBody(''); setPics([]); setDocs([]);
      onToast(`${targets.length ? targets.join('·') : '전체'}에 실적 공유를 올렸습니다.`);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4">
      <h3 className="font-bold text-slate-900">📊 {me.title ?? '점장'} 실적 공유 올리기</h3>
      <div className="flex flex-wrap gap-2">
        <Chip active={!targets.length} onClick={() => setTargets([])}>전체</Chip>
        {DEPARTMENTS.map(d => <Chip key={d} active={targets.includes(d)} onClick={() => toggle(d)}>{d}</Chip>)}
      </div>
      <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="제목 (예: 10월 판매장인 실적 · 절임배추 사전예약 실적)" maxLength={80} />
      <button type="button" onClick={dictation.listening ? dictation.stop : dictation.start}
        className={cx('flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white', dictation.listening ? 'bg-red-600 motion-safe:animate-pulse' : 'bg-slate-800')}>
        {dictation.listening ? <><MicOff className="size-4" />말하는 중… 끝나면 눌러 주세요</> : <><Mic className="size-4" />내용 말로 입력</>}
      </button>
      {dictation.problem && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{dictation.problem}</p>}
      {!dictation.listening && <Examples items={['우리 점 수산 파트 이번 달 매출 1위입니다. 모두 수고하셨습니다', '절임배추 사전예약 목표 대비 120% 달성했습니다', '다음 주 행사 준비 잘 부탁드립니다']} />}
      <textarea className={cx(inputCls, 'min-h-20')} value={body} onChange={e => setBody(e.target.value)} placeholder="내용 (예: 우리 점 수산 파트 1위! 모두 수고하셨습니다)" maxLength={1000} />

      {pics.map((p, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-slate-200 p-2">
          <div className="relative">
            <img src={p.src} alt={`실적 사진 ${i + 1}`} className="max-h-72 w-full rounded-lg bg-slate-100 object-contain" />
            <button type="button" onClick={() => setPics(x => x.filter((_, k) => k !== i))} aria-label={`사진 ${i + 1} 빼기`} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="size-4" /></button>
          </div>
          <label className="block space-y-1">
            <span className="flex items-center gap-1 text-xs font-bold text-indigo-700">
              {p.reading ? <><Loader2 className="size-3.5 animate-spin" />AI가 사진 내용을 정리하는 중…</> : <><Sparkles className="size-3.5" />사진 설명 {aiEnabled ? '(AI 요약 · 고칠 수 있음)' : '(직접 입력)'}</>}
            </span>
            <textarea className={cx(inputCls, 'min-h-16 text-sm')} value={p.caption} onChange={e => setPics(x => x.map((y, k) => (k === i ? { ...y, caption: e.target.value } : y)))}
              placeholder="예: 10월 판매장인 지표 — 우리 점 종합 10위(84.8점), 수산 1위(90.6점)" maxLength={300} />
          </label>
        </div>
      ))}

      {docs.length > 0 && (
        <ul className="space-y-1.5">
          {docs.map((d, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-slate-500" /><span className="min-w-0 flex-1 truncate">{d.name}</span>
              <span className="text-xs text-slate-400">{d.data ? kb(d.size) : '읽는 중…'}</span>
              <button type="button" onClick={() => setDocs(x => x.filter((_, k) => k !== i))} aria-label={`${d.name} 빼기`}><X className="size-4 text-slate-400" /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={pics.length >= MAX_NOTICE_PHOTOS} onClick={() => picRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-blue-600 py-3 text-sm font-bold text-blue-700 disabled:opacity-40">
          <ImagePlus className="size-4" />사진 ({pics.length}/{MAX_NOTICE_PHOTOS})
        </button>
        <button type="button" disabled={docs.length >= 5} onClick={() => docRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-slate-300 py-3 text-sm font-bold text-slate-700 disabled:opacity-40">
          <Paperclip className="size-4" />파일 (엑셀·PDF)
        </button>
      </div>
      <input ref={picRef} type="file" accept="image/*" multiple hidden onChange={e => { void addPics(e.target.files); e.target.value = ''; }} />
      <input ref={docRef} type="file" accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt,.hwp,.hwpx,.txt,.zip" multiple hidden onChange={e => { void addDocs(e.target.files); e.target.value = ''; }} />
      <button type="button" onClick={submit} disabled={busy || pics.some(p => p.reading)} className={primaryBtn}>
        {busy ? '올리는 중…' : pics.some(p => p.reading) ? '사진 정리가 끝나면 올릴 수 있습니다' : `${targets.length ? targets.join('·') : '전체'}에 실적 공유 올리기`}
      </button>
    </div>
  );
}

/** 실적 공유 한 건: 사진은 크게, 사진마다 아래에 설명 */
export function ShareCard({ n, me, onError }: { n: Notice; me: Staff; onError: (m: string) => void }) {
  const [big, setBig] = useState<string | null>(null);
  const read = n.readBy.includes(me.id);
  return (
    <article className={cx('space-y-3 rounded-2xl border border-slate-200 bg-white p-4', !read && 'ring-2 ring-blue-100')}>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="font-bold text-slate-700">📊 실적 공유 · {noticeTarget(n)}</span>
        <span>{n.by.name} {n.byTitle ?? ''} · {new Date(n.createdAt).toLocaleDateString('ko-KR')} {clock(n.createdAt)}</span>
      </div>
      <h3 className="text-[17px] font-black text-slate-900">{n.title}</h3>
      {n.body && <p className="whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>}
      {n.photos?.map((id, i) => (
        <figure key={id} className="space-y-1.5">
          <button type="button" onClick={() => setBig(id)} className="block w-full overflow-hidden rounded-xl bg-slate-100">
            <img src={photoUrl(id)} alt={`실적 사진 ${i + 1}`} loading="lazy" className="w-full object-contain" />
          </button>
          {n.photoCaptions?.[i] && (
            <figcaption className="flex gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-medium leading-relaxed text-indigo-950">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-indigo-500" /><span className="whitespace-pre-wrap">{n.photoCaptions[i]}</span>
            </figcaption>
          )}
        </figure>
      ))}
      {n.files?.length ? (
        <ul className="space-y-1.5">
          {n.files.map(f => (
            <li key={f.id}>
              <a href={fileUrl(f.id)} download={f.name} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-semibold text-blue-700">
                <FileText className="size-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{f.name}</span><span className="text-xs font-normal text-slate-400">{kb(f.size)} · 받기</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-2">읽음 {n.readBy.length}명
          <button onClick={() => speak(`실적 공유. ${n.title}. ${(n.photoCaptions ?? []).filter(Boolean).join('. ')}`)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 font-bold text-slate-700"><Volume2 className="size-3.5" />듣기</button>
        </span>
        {!read && <button onClick={() => send(`/notices/${n.id}/read`, {}, `확인: ${n.title}`).catch(e => onError(e.message))} className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white">확인했습니다</button>}
      </div>
      {big && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2" onClick={() => setBig(null)} role="dialog" aria-modal="true" aria-label="사진 크게 보기">
          <img src={photoUrl(big)} alt="실적 사진 크게 보기" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </article>
  );
}

export default function SharePanel({ notices, me, aiEnabled, onError, onToast }: { notices: Notice[]; me: Staff; aiEnabled: boolean; onError: (m: string) => void; onToast: (m: string) => void }) {
  const list = notices.filter(n => n.kind === 'share' && (noticeFor(n, me.dept) || me.role === 'manager')).sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div className="space-y-3">
      {me.role === 'manager' && <ShareComposer me={me} aiEnabled={aiEnabled} onError={onError} onToast={onToast} />}
      {list.length ? list.map(n => <ShareCard key={n.id} n={n} me={me} onError={onError} />) : <Empty>아직 올라온 실적 공유가 없습니다.</Empty>}
    </div>
  );
}
