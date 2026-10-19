import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, Check, Download, FolderOpen, Gauge, Loader2, Paperclip, Megaphone, Mic, Music, Pencil, Plus, RotateCw, Share2, Trash2, Users, User, Wand2 } from 'lucide-react';
import type { FlyerItem, VisionFlyerResult } from '../shared';
import { FLYER_FILE_ACCEPT, flyerFileToDataUrl, isPdf } from '../camera';
import { FLYER_MAX_SIDE } from './CameraView';
import {
  BRAND, BROADCAST_THEMES, HOST_AGES, HOST_GENDERS, LENGTH_CHOICES, PACES, hasBrand, hostLabel, lengthLabel, paceOf, parseItemLine, type Pace,
  type BroadcastMusic, type BroadcastScript, type BroadcastSegment, type BroadcastSpeech, type BroadcastTheme, type Host,
} from '../broadcast';
import { decodeMusic, mixBroadcast, pcmToBuffer, toMp3, toWav } from '../broadcast-audio';
import { deleteBroadcast, downloadBlob, listBroadcasts, safeFileName, saveBroadcast, type SavedBroadcast } from '../broadcast-library';
import { api } from '../api';
import { Chip, cx, inputCls, won } from '../ui';

type Item = FlyerItem & { key: string; include: boolean };
type Step = 'setup' | 'script' | 'making' | 'done' | 'library';
type State = 'waiting' | 'making' | 'done' | 'failed';
type Progress = { voice: number; voices: number; music: 'off' | State; mixing: State };
type Result = { url: string; mp3: Blob; wav: Blob; seconds: number; musicFailed: boolean; saved: boolean };

const SPEECH_PARALLEL = 2;
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-pink-500';
const HOST_TONE = ['bg-pink-100 text-pink-700', 'bg-sky-100 text-sky-700'];
const DUO: Host[] = [{ gender: '여성', age: '30대' }, { gender: '남성', age: '40대' }];
const NO_KEY = 'AI 키(GEMINI_API_KEY)가 서버에 없어 전단을 읽거나 방송을 만들 수 없습니다. Cloudflare → Workers → maket-moum → 설정 → 변수 및 비밀에 GEMINI_API_KEY를 넣어 주세요.';
const mb = (b: Blob) => `${(b.size / 1048576).toFixed(1)}MB`;

/** 행사 매장 방송 만들기: 행사상품 → 쇼호스트 원고 → 음성 + 배경음악 → 1~3분 방송 파일 (MP3·WAV) */
export default function BroadcastMaker({ items: source, aiEnabled, startInLibrary, onClose, onError }: {
  items: FlyerItem[]; aiEnabled: boolean; startInLibrary?: boolean; onClose: () => void; onError: (m: string) => void;
}) {
  const [items, setItems] = useState<Item[]>(() => source.map((it, i) => ({ ...it, key: `${i}-${it.name}`, include: i < 12 })));
  const [reading, setReading] = useState(0);
  const [draft, setDraft] = useState('');
  const albumRef = useRef<HTMLInputElement>(null);
  const seq = useRef(source.length);
  const [seconds, setSeconds] = useState<number>(120);
  const [theme, setTheme] = useState<BroadcastTheme>('자동');
  const [hosts, setHosts] = useState<Host[]>([{ gender: '여성', age: '30대' }]);
  const [withMusic, setWithMusic] = useState(true);
  const [pace, setPace] = useState<Pace>('brisk'); // 기본은 템포 있게
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [step, setStep] = useState<Step>(startInLibrary ? 'library' : 'setup');
  const [busy, setBusy] = useState(false);
  const [script, setScript] = useState<BroadcastScript | null>(null);
  const [progress, setProgress] = useState<Progress>({ voice: 0, voices: 0, music: 'off', mixing: 'waiting' });
  const [result, setResult] = useState<Result | null>(null);
  const [library, setLibrary] = useState<SavedBroadcast[]>([]);
  // 같은 원고·목소리는 다시 만들지 않는다 (요금 절약, 고친 단락만 새로)
  const speechCache = useRef(new Map<string, AudioBuffer>());
  const musicCache = useRef(new Map<string, AudioBuffer>());
  const chosen = items.filter(i => i.include);

  useEffect(() => { void listBroadcasts().then(setLibrary); }, []);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  const addItems = (list: FlyerItem[]) => setItems(xs => {
    const next = [...xs];
    for (const it of list) {
      if (next.some(x => x.name.replace(/\s+/g, '') === it.name.replace(/\s+/g, '') && (x.spec ?? '') === (it.spec ?? ''))) continue;
      next.push({ ...it, key: `n${++seq.current}`, include: next.filter(x => x.include).length < 12 });
    }
    return next;
  });

  // 전단 사진을 여기서 바로 읽는다 (한 장씩 차례로)
  const pickFlyers = async (files: FileList | null) => {
    const list = [...(files ?? [])].filter(f => f.type.startsWith('image/') || isPdf(f)).slice(0, 4);
    if (!list.length && files?.length) onError('사진(jpg·png 등)이나 PDF 파일만 올릴 수 있습니다.');
    if (!list.length) return;
    setReading(list.length);
    for (const f of list) {
      try {
        const r = await api<VisionFlyerResult>('/ai/vision', { mode: 'flyer', image: await flyerFileToDataUrl(f, FLYER_MAX_SIDE) });
        if (!r.items.length) onError('전단에서 행사상품을 찾지 못했습니다. 더 가까이, 밝은 곳에서 찍은 사진으로 다시 해 주세요.');
        addItems(r.items);
      } catch (e) {
        onError((e as Error).message);
      } finally {
        setReading(n => n - 1);
      }
    }
  };

  // 한 줄 입력: "노르웨이 생연어 100g 5,990원→3,990원 엘포인트 30%" → 상품명·규격·정상가·행사가·혜택으로 나눈다
  const addDraft = () => {
    const lines = draft.split(/\n|;/).map(parseItemLine).filter((x): x is FlyerItem => Boolean(x));
    if (!lines.length) return onError('상품명을 입력해 주세요. 예: 노르웨이 생연어 100g 3,990원 엘포인트 30%');
    addItems(lines);
    setDraft('');
  };
  const editItem = (key: string, patch: Partial<Item>) => setItems(xs => xs.map(x => (x.key === key ? { ...x, ...patch } : x)));

  const setHost = (i: number, patch: Partial<Host>) => setHosts(hs => hs.map((h, j) => (j === i ? { ...h, ...patch } : h)));

  const writeScript = async () => {
    if (!chosen.length) return onError('방송할 행사상품을 한 개 이상 골라 주세요.');
    setBusy(true);
    try {
      const s = await api<BroadcastScript>('/ai/broadcast/script', {
        items: chosen.map(({ name, code, spec, price, originalPrice, condition, period }) => ({ name, code, spec, price, originalPrice, condition, period })),
        seconds, theme, hosts, pace, note: note.trim() || undefined,
      });
      setScript(s);
      setStep('script');
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const editLine = (si: number, li: number, patch: Partial<BroadcastSegment['lines'][number]>) =>
    setScript(s => s && { ...s, segments: s.segments.map((seg, i) => (i !== si ? seg : { lines: seg.lines.map((l, j) => (j === li ? { ...l, ...patch } : l)) })) });

  const make = async () => {
    if (!script) return;
    const segments = script.segments
      .map(s => ({ lines: s.lines.map(l => ({ ...l, text: l.text.trim() })).filter(l => l.text) }))
      .filter(s => s.lines.length);
    if (!segments.length) return onError('원고가 비어 있습니다.');
    setStep('making');
    setResult(null);
    setProgress({ voice: 0, voices: segments.length, music: withMusic ? 'making' : 'off', mixing: 'waiting' });

    const musicKey = `${script.music}|${seconds}`;
    const musicJob: Promise<AudioBuffer | null> = !withMusic ? Promise.resolve(null)
      : musicCache.current.has(musicKey) ? Promise.resolve(musicCache.current.get(musicKey)!)
      : api<BroadcastMusic>('/ai/broadcast/music', { music: script.music, seconds })
        .then(m => decodeMusic(m.audio))
        .then(buf => { musicCache.current.set(musicKey, buf); return buf; });
    musicJob.then(m => setProgress(p => ({ ...p, music: m ? 'done' : 'off' })), () => setProgress(p => ({ ...p, music: 'failed' })));

    try {
      const voices: AudioBuffer[] = new Array(segments.length);
      let next = 0;
      const worker = async () => {
        while (next < segments.length) {
          const i = next++;
          const key = JSON.stringify([script.hosts, script.tone, script.pace, segments[i].lines]);
          let buf = speechCache.current.get(key);
          if (!buf) {
            const r = await api<BroadcastSpeech>('/ai/broadcast/speech', { lines: segments[i].lines, hosts: script.hosts, tone: script.tone, pace: script.pace });
            buf = pcmToBuffer(r.audio, r.sampleRate);
            speechCache.current.set(key, buf);
          }
          voices[i] = buf;
          setProgress(p => ({ ...p, voice: p.voice + 1 }));
        }
      };
      await Promise.all(Array.from({ length: Math.min(SPEECH_PARALLEL, segments.length) }, worker));

      const music = await musicJob.catch(() => null); // 음악이 안 되면 음성만으로
      setProgress(p => ({ ...p, mixing: 'making' }));
      const mixed = await mixBroadcast(voices, music, seconds);
      const mp3 = await toMp3(mixed);
      const wav = toWav(mixed);
      const secs = Math.round(mixed.duration);
      const saved = await saveBroadcast({ id: crypto.randomUUID(), title: script.title, theme: script.theme, hosts: script.hosts.map(hostLabel).join(' · '), seconds: secs, createdAt: Date.now(), mp3 });
      if (saved) void listBroadcasts().then(setLibrary);
      setResult({ url: URL.createObjectURL(mp3), mp3, wav, seconds: secs, musicFailed: withMusic && !music, saved });
      setStep('done');
    } catch (e) {
      onError((e as Error).message || '방송을 만들지 못했습니다.');
      setStep('script');
    }
  };

  const share = async (blob: Blob, name: string) => {
    const file = new File([blob], name, { type: blob.type });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: name });
      else downloadBlob(blob, name);
    } catch { /* 공유 취소 */ }
  };

  const back = () => {
    if (step === 'making') return;
    if (step === 'setup' || (step === 'library' && startInLibrary && !script)) return onClose();
    setStep(step === 'done' ? 'script' : step === 'script' ? 'setup' : script && result ? 'done' : script ? 'script' : 'setup');
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-50" role="dialog" aria-modal="true" aria-label="행사 매장 방송 만들기">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white px-3 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))]">
        <button type="button" onClick={back} disabled={step === 'making'} aria-label="뒤로" className="rounded-lg p-2 text-slate-600 active:bg-slate-100 disabled:opacity-40"><ArrowLeft className="size-5" /></button>
        <Megaphone className="size-5 shrink-0 text-pink-600" />
        <h1 className="min-w-0 flex-1 truncate text-[16px] font-bold text-slate-900">{step === 'library' ? '방송 보관함' : '행사 매장 방송 만들기'}</h1>
        {step !== 'library' && step !== 'making' && (
          <button type="button" onClick={() => setStep('library')} className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-600 active:bg-slate-100">
            <FolderOpen className="size-4" />보관함{library.length > 0 && <span className="text-pink-600">{library.length}</span>}
          </button>
        )}
      </div>

      <div className="mx-auto max-w-2xl space-y-5 p-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {!aiEnabled && step !== 'library' && (
          <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            AI 키(GEMINI_API_KEY)가 서버에 설정되지 않아 방송을 만들 수 없습니다. Cloudflare → Workers → maket-moum → 설정 → 변수 및 비밀에 <b>GEMINI_API_KEY</b>를 넣으면 바로 켜집니다. 보관함의 방송은 지금도 들을 수 있습니다.
          </p>
        )}
        {step === 'setup' && <>
          <section className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-slate-700">1. 방송할 행사상품</h2>
              <span className="text-xs font-semibold text-slate-500">{chosen.length} / {items.length}개</span>
            </div>
            {items.length === 0 && !reading && <p className="rounded-2xl bg-white px-3.5 py-4 text-sm text-slate-600">방송할 행사상품이 없습니다. 아래에서 <b>전단 사진</b>을 올리거나 직접 입력해 주세요.</p>}
            {items.length > 0 && <div className={cx('divide-y divide-slate-100 overflow-y-auto rounded-2xl bg-white', !editing && 'max-h-72')}>
              {items.map(it => editing === it.key ? (
                <div key={it.key} className="space-y-2 bg-pink-50/50 px-3.5 py-3">
                  <label className="block text-[11px] font-semibold text-slate-500 space-y-0.5">상품명<input className={field} value={it.name} onChange={e => editItem(it.key, { name: e.target.value })} maxLength={60} /></label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] font-semibold text-slate-500 space-y-0.5">규격·중량<input className={field} value={it.spec ?? ''} onChange={e => editItem(it.key, { spec: e.target.value || undefined })} maxLength={40} placeholder="100g, 2kg/박스" /></label>
                    <label className="text-[11px] font-semibold text-slate-500 space-y-0.5">행사기간<input className={field} value={it.period ?? ''} onChange={e => editItem(it.key, { period: e.target.value || undefined })} maxLength={40} placeholder="10/16~10/22" /></label>
                    <label className="text-[11px] font-semibold text-slate-500 space-y-0.5">정상가<input className={field} inputMode="numeric" value={it.originalPrice?.toLocaleString() ?? ''} onChange={e => editItem(it.key, { originalPrice: Number(e.target.value.replace(/\D/g, '')) || undefined })} placeholder="원" /></label>
                    <label className="text-[11px] font-semibold text-slate-500 space-y-0.5 text-pink-600">행사가<input className={cx(field, 'font-bold text-pink-700')} inputMode="numeric" value={it.price?.toLocaleString() ?? ''} onChange={e => editItem(it.key, { price: Number(e.target.value.replace(/\D/g, '')) || undefined })} placeholder="원" /></label>
                  </div>
                  <label className="block text-[11px] font-semibold text-slate-500 space-y-0.5">혜택<input className={field} value={it.condition ?? ''} onChange={e => editItem(it.key, { condition: e.target.value || undefined })} maxLength={100} placeholder="엘포인트 30%, 1+1" /></label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setItems(xs => xs.filter(x => x.key !== it.key))} className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500"><Trash2 className="size-4" />빼기</button>
                    <button type="button" onClick={() => setEditing(null)} className="ml-auto flex items-center gap-1 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white"><Check className="size-4" />완료</button>
                  </div>
                </div>
              ) : (
                <div key={it.key} className="flex items-start gap-3 px-3.5 py-2.5">
                  <input type="checkbox" checked={it.include} onChange={e => editItem(it.key, { include: e.target.checked })} aria-label={`${it.name} 방송에 넣기`} className="mt-0.5 size-5 shrink-0 accent-pink-600" />
                  <button type="button" onClick={() => setEditing(it.key)} className="min-w-0 flex-1 text-left text-sm">
                    <span className="font-semibold text-slate-900">{it.name}</span>{it.spec && <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">{it.spec}</span>}
                    <span className="block text-xs text-slate-500">
                      {it.originalPrice && it.price && it.originalPrice > it.price && <span className="mr-1 line-through">{won(it.originalPrice)}</span>}
                      {it.price ? <b className="text-pink-700">{won(it.price)}</b> : <span className="text-amber-600">가격 없음</span>}
                      {[it.condition, it.period].filter(Boolean).map(x => ` · ${x}`).join('')}
                    </span>
                  </button>
                  <button type="button" onClick={() => setEditing(it.key)} aria-label={`${it.name} 고치기`} className="shrink-0 rounded-lg p-1.5 text-slate-400 active:bg-slate-100"><Pencil className="size-4" /></button>
                </div>
              ))}
            </div>}
            <button type="button" onClick={() => (aiEnabled ? albumRef.current?.click() : onError(NO_KEY))} disabled={reading > 0} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-pink-200 bg-white py-3 text-sm font-bold text-pink-700 active:bg-pink-50 disabled:opacity-50">
              {reading > 0 ? <><Loader2 className="size-4 animate-spin" />전단 읽는 중… (한 장에 10~20초)</> : <><Paperclip className="size-4" />전단 파일 첨부 (사진·PDF · 찍기)</>}
            </button>
            <input ref={albumRef} type="file" accept={FLYER_FILE_ACCEPT} multiple hidden onChange={e => { void pickFlyers(e.target.files); e.target.value = ''; }} />
            <div className="flex gap-2">
              <input className={field} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDraft(); } }} maxLength={160} placeholder="한 줄로: 생연어 100g 3,990원 엘포인트 30%" aria-label="상품 한 줄 입력" />
              <button type="button" onClick={addDraft} className="flex shrink-0 items-center justify-center gap-1 rounded-xl bg-slate-800 px-4 text-sm font-bold text-white"><Plus className="size-4" />추가</button>
            </div>
            <p className="text-xs text-slate-500">상품명·규격(그램 등)·가격·혜택을 한 줄로 쓰면 알아서 나눕니다. 정상가도 있으면 "5,990원→3,990원"처럼. 상품을 누르면 고칠 수 있어요.</p>
            <p className="text-xs text-slate-500">30초면 1~2개, 1분이면 3~5개, 3분이면 8~12개가 듣기 좋습니다.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700">2. 방송 길이</h2>
            <div className="flex flex-wrap gap-2">{LENGTH_CHOICES.map(s => <Chip key={s} active={seconds === s} onClick={() => setSeconds(s)}>{lengthLabel(s)}</Chip>)}</div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700">3. 행사 분위기</h2>
            <div className="flex flex-wrap gap-2">{BROADCAST_THEMES.map(t => <Chip key={t} active={theme === t} onClick={() => setTheme(t)}>{t === '자동' ? '자동 (AI가 판단)' : t}</Chip>)}</div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700">4. 쇼호스트</h2>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setHosts(hs => [hs[0]])} className={cx('flex items-center justify-center gap-1.5 rounded-xl border-2 py-3 text-sm font-bold', hosts.length === 1 ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-600')}>
                <User className="size-4" />1인 진행
              </button>
              <button type="button" onClick={() => setHosts(hs => [hs[0], hs[1] ?? DUO.find(d => d.gender !== hs[0].gender)!])} className={cx('flex items-center justify-center gap-1.5 rounded-xl border-2 py-3 text-sm font-bold', hosts.length === 2 ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-600')}>
                <Users className="size-4" />2인 대화
              </button>
            </div>
            {hosts.map((h, i) => (
              <div key={i} className="space-y-2 rounded-2xl bg-white p-3.5">
                {hosts.length > 1 && <span className={cx('rounded px-2 py-0.5 text-xs font-bold', HOST_TONE[i])}>진행자 {i + 1}</span>}
                <div className="flex flex-wrap gap-2">{HOST_GENDERS.map(g => <Chip key={g} active={h.gender === g} onClick={() => setHost(i, { gender: g })}>{g}</Chip>)}</div>
                <div className="flex flex-wrap gap-2">{HOST_AGES.map(a => <Chip key={a} active={h.age === a} onClick={() => setHost(i, { age: a })}>{a}</Chip>)}</div>
              </div>
            ))}
            <p className="text-xs text-slate-500">홈쇼핑 쇼호스트처럼 말합니다. 2인 대화는 두 사람이 주고받으며 맞장구치는 방송입니다.</p>
          </section>

          <section className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Gauge className="size-4" />5. 말 빠르기</h2>
            <div className="flex flex-wrap gap-2">{PACES.map(p => <Chip key={p.id} active={pace === p.id} onClick={() => setPace(p.id)}>{p.label}</Chip>)}</div>
            <p className="text-xs text-slate-500">빠를수록 같은 시간에 더 많은 상품을 소개합니다. 가격·숫자는 또렷하게 읽습니다.</p>
          </section>

          <section className="space-y-2">
            <label className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3">
              <input type="checkbox" checked={withMusic} onChange={e => setWithMusic(e.target.checked)} className="size-5 accent-pink-600" />
              <span className="text-sm"><span className="font-semibold text-slate-900">행사 분위기 배경음악 넣기</span><span className="block text-xs text-slate-500">AI가 새로 작곡한 잔잔한 연주곡. 목소리보다 항상 작게 깔리고, 말할 때는 더 줄어듭니다.</span></span>
            </label>
            <input className={inputCls} value={note} onChange={e => setNote(e.target.value)} maxLength={100} placeholder="덧붙일 말 (선택) 예: 오후 3시까지만, 주차 2시간 무료" />
          </section>

          <button type="button" onClick={() => (aiEnabled ? void writeScript() : onError(NO_KEY))} disabled={busy || !chosen.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 py-3.5 text-[15px] font-bold text-white active:bg-pink-700 disabled:opacity-50">
            {busy ? <><Loader2 className="size-5 animate-spin" />쇼호스트 원고 쓰는 중…</> : <><Wand2 className="size-5" />방송 원고 만들기</>}
          </button>
        </>}

        {step === 'script' && script && <>
          <section className="space-y-1.5">
            <input className={cx(field, 'font-bold')} value={script.title} onChange={e => setScript({ ...script, title: e.target.value })} maxLength={40} aria-label="방송 제목" />
            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
              <span className="rounded bg-pink-100 px-2 py-0.5 text-pink-700">{script.theme}</span>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-slate-700">{lengthLabel(seconds)} 목표</span>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-slate-700">말 빠르기 {paceOf(script.pace).label}</span>
              {script.hosts.map((h, i) => <span key={i} className={cx('rounded px-2 py-0.5', script.hosts.length > 1 ? HOST_TONE[i] : 'bg-slate-200 text-slate-700')}>{hostLabel(h)} 쇼호스트</span>)}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Pencil className="size-4" />방송 원고</h2>
              <p className="text-xs text-slate-500">눌러서 고칠 수 있습니다. 단락 사이에는 배경음악이 잠깐 나옵니다.{script.hosts.length > 1 && ' 진행자 이름표를 누르면 말하는 사람이 바뀝니다.'}</p>
            </div>
            {script.segments.map((seg, si) => (
              <div key={si} className="space-y-2 rounded-2xl bg-white p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>{si + 1}단락</span>
                  {!hasBrand(seg) && <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="size-3.5" />"{BRAND}"를 넣어 주세요</span>}
                </div>
                {seg.lines.map((l, li) => (
                  <div key={li} className="space-y-1">
                    {script.hosts.length > 1 && (
                      <button type="button" onClick={() => editLine(si, li, { who: l.who === 0 ? 1 : 0 })} className={cx('rounded px-2 py-0.5 text-xs font-bold', HOST_TONE[l.who])}>
                        진행자 {l.who + 1} · {hostLabel(script.hosts[l.who])}
                      </button>
                    )}
                    <textarea rows={Math.min(6, Math.max(2, Math.ceil(l.text.length / 30)))} className={cx(field, 'resize-none')} value={l.text} onChange={e => editLine(si, li, { text: e.target.value })} maxLength={300} aria-label={`${si + 1}단락 ${li + 1}번째 대사`} />
                  </div>
                ))}
              </div>
            ))}
          </section>

          <details className="rounded-2xl bg-white px-3.5 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">말투·배경음악 설정 고치기</summary>
            <div className="mt-3 space-y-3">
              <label className="block space-y-1 text-xs font-semibold text-slate-500">말투 (쇼호스트 연기 지시)
                <input className={field} value={script.tone} onChange={e => setScript({ ...script, tone: e.target.value })} maxLength={120} />
              </label>
              <label className="block space-y-1 text-xs font-semibold text-slate-500">배경음악 설명 (영어로 쓰면 더 정확합니다)
                <textarea rows={3} className={cx(field, 'resize-none')} value={script.music} onChange={e => setScript({ ...script, music: e.target.value })} maxLength={300} />
              </label>
            </div>
          </details>

          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button type="button" onClick={() => void writeScript()} disabled={busy} className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-pink-200 bg-white px-4 py-3.5 text-sm font-bold text-pink-700 disabled:opacity-50">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />}다시 쓰기
            </button>
            <button type="button" onClick={() => void make()} disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-pink-600 py-3.5 text-[15px] font-bold text-white active:bg-pink-700 disabled:opacity-50">
              <Mic className="size-5" />{withMusic ? '음성·음악 만들기' : '음성 만들기'}
            </button>
          </div>
        </>}

        {step === 'making' && (
          <section className="space-y-3 rounded-2xl bg-white p-5">
            <p className="font-bold text-slate-900">방송을 만들고 있습니다</p>
            <Row icon={<Mic className="size-4" />} label={`쇼호스트 음성 ${progress.voice} / ${progress.voices} 단락`} state={progress.voice >= progress.voices ? 'done' : 'making'} />
            {progress.music !== 'off' && <Row icon={<Music className="size-4" />} label={progress.music === 'failed' ? '배경음악 실패 · 음성만으로 만듭니다' : '배경음악 작곡'} state={progress.music} />}
            <Row icon={<Download className="size-4" />} label="음성·음악 합치고 MP3 만들기" state={progress.mixing} />
            <p className="text-xs text-slate-500">1~2분쯤 걸립니다. 화면을 닫지 말고 기다려 주세요.</p>
          </section>
        )}

        {step === 'done' && result && script && <>
          <section className="space-y-3 rounded-2xl bg-white p-4">
            <div>
              <p className="font-bold text-slate-900">{script.title}</p>
              <p className="text-xs text-slate-500">{Math.floor(result.seconds / 60)}분 {result.seconds % 60}초 · {script.theme} · {script.hosts.map(hostLabel).join(' · ')}</p>
            </div>
            <audio src={result.url} controls loop className="w-full" />
            {result.musicFailed && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">배경음악을 만들지 못해 음성만 담았습니다. 잠시 후 아래 "음악 새로 만들기"를 눌러 주세요 (음성은 다시 만들지 않습니다).</p>}
            <button type="button" onClick={() => downloadBlob(result.mp3, safeFileName(script.title, 'mp3'))} className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 py-3.5 text-[15px] font-bold text-white active:bg-pink-700">
              <Download className="size-5" />MP3 다운로드 ({mb(result.mp3)})
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => downloadBlob(result.wav, safeFileName(script.title, 'wav'))} className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-pink-200 bg-white py-3 text-sm font-bold text-pink-700"><Download className="size-4" />WAV 원음 ({mb(result.wav)})</button>
              <button type="button" onClick={() => void share(result.mp3, safeFileName(script.title, 'mp3'))} className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-pink-200 bg-white py-3 text-sm font-bold text-pink-700"><Share2 className="size-4" />공유 (카톡 등)</button>
            </div>
            <p className="text-xs text-slate-500">
              {result.saved ? '보관함에 저장했습니다. 언제든 다시 듣고 내려받을 수 있습니다. ' : ''}
              휴대폰을 방송 앰프에 연결해 반복 재생하거나, 파일을 매장 방송 PC에 옮겨 틀어 주세요.
            </p>
          </section>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setStep('script')} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-bold text-slate-700"><Pencil className="size-4" />원고 고치기</button>
            <button type="button" onClick={() => { musicCache.current.clear(); void make(); }} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-bold text-slate-700">{withMusic ? <><Music className="size-4" />음악 새로 만들기</> : <><RotateCw className="size-4" />다시 만들기</>}</button>
          </div>
        </>}

        {step === 'library' && <Library items={library} onChange={() => void listBroadcasts().then(setLibrary)} onShare={share} />}
      </div>
    </div>
  );
}

/** 이 기기에 저장된 방송: 다시 듣기·MP3 다운로드·공유·삭제 */
function Library({ items, onChange, onShare }: { items: SavedBroadcast[]; onChange: () => void; onShare: (b: Blob, name: string) => Promise<void> }) {
  const [open, setOpen] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => () => { if (open) URL.revokeObjectURL(open.url); }, [open]);
  if (!items.length) return <p className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">아직 만든 방송이 없습니다.<br />행사 전단을 올린 뒤 "매장 방송 만들기"를 눌러 보세요.</p>;
  return (
    <section className="space-y-2">
      <p className="text-xs text-slate-500">이 휴대폰에 최근 20개까지 MP3로 보관됩니다. 앱 데이터를 지우면 함께 지워집니다.</p>
      {items.map(b => (
        <div key={b.id} className="space-y-2 rounded-2xl bg-white p-3.5">
          <button type="button" onClick={() => setOpen(o => (o?.id === b.id ? null : { id: b.id, url: URL.createObjectURL(b.mp3) }))} className="w-full text-left">
            <p className="font-bold text-slate-900">{b.title}</p>
            <p className="text-xs text-slate-500">{new Date(b.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {Math.floor(b.seconds / 60)}분 {b.seconds % 60}초 · {b.theme} · {b.hosts}</p>
          </button>
          {open?.id === b.id && <audio src={open.url} controls autoPlay loop className="w-full" />}
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <button type="button" onClick={() => downloadBlob(b.mp3, safeFileName(b.title, 'mp3'))} className="flex items-center justify-center gap-1.5 rounded-xl bg-pink-600 py-2.5 text-sm font-bold text-white"><Download className="size-4" />MP3 다운로드</button>
            <button type="button" onClick={() => void onShare(b.mp3, safeFileName(b.title, 'mp3'))} className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-pink-200 py-2.5 text-sm font-bold text-pink-700"><Share2 className="size-4" />공유</button>
            <button type="button" aria-label="삭제" onClick={() => { if (confirm(`"${b.title}" 방송을 지울까요?`)) void deleteBroadcast(b.id).then(onChange); }} className="rounded-xl px-3 text-slate-400 active:bg-slate-100"><Trash2 className="size-4" /></button>
          </div>
        </div>
      ))}
    </section>
  );
}

function Row({ icon, label, state }: { icon: ReactNode; label: string; state: State }) {
  return (
    <div className={cx('flex items-center gap-2.5 text-sm', state === 'waiting' ? 'text-slate-400' : state === 'failed' ? 'text-amber-700' : 'text-slate-800')}>
      {state === 'making' ? <Loader2 className="size-4 animate-spin text-pink-600" /> : icon}
      <span className={cx(state === 'done' && 'font-semibold text-emerald-700')}>{label}{state === 'done' && ' ✓'}</span>
    </div>
  );
}
