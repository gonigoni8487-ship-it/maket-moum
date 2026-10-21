import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ChevronUp, Download, FolderOpen, Gauge, Loader2, Paperclip, Megaphone, Mic, Music, Pencil, Plus, RotateCw, Share2, Sparkles, Trash2, Users, User, Wand2, X } from 'lucide-react';
import type { FlyerItem, VisionFlyerResult } from '../shared';
import { FLYER_FILE_ACCEPT, flyerFileToDataUrl, isPdf } from '../camera';
import { FLYER_MAX_SIDE } from './CameraView';
import {
  BRAND, BROADCAST_THEMES, HOST_AGES, HOST_GENDERS, LENGTH_CHOICES, PACES, VOICE_STYLES, koreanNumber, scriptGaps, voiceStyleLabel, type VoiceStyle, hasBrand, hasPlaceMention, hostLabel, lengthLabel, paceOf, parseItemLine, type Pace,
  type BroadcastMusic, type BroadcastScript, type BroadcastSegment, type BroadcastSpeech, type BroadcastTheme, type Host,
} from '../broadcast';
import { decodeMusic, decodeMusicFile, joinBuffers, mixBroadcast, pcmToBuffer, toMp3, toWav } from '../broadcast-audio';
import { deleteBroadcast, downloadBlob, listBroadcasts, safeFileName, saveBroadcast, type SavedBroadcast } from '../broadcast-library';
import { api } from '../api';
import BroadcastNote, { useBroadcastNote } from './BroadcastNote';
import { Chip, cx, inputCls, won } from '../ui';

type Item = FlyerItem & { key: string; include: boolean };
type Step = 'setup' | 'script' | 'making' | 'done' | 'library';
type State = 'waiting' | 'making' | 'done' | 'failed';
type Progress = { voice: number; voices: number; music: 'off' | State; mixing: State };
type Result = { url: string; mp3: Blob; wav: Blob; seconds: number; musicFailed: boolean; saved: boolean };

const SPEECH_PARALLEL = 2;
const SPEECH_CHUNK_CHARS = 500; // 서버 한 번 한도(단락 700자·대사 16개)보다 작게
const SPEECH_CHUNK_LINES = 12;
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-pink-500';
const HOST_TONE = ['bg-pink-100 text-pink-700', 'bg-sky-100 text-sky-700'];
const DUO: Host[] = [{ gender: '여성', age: '30대' }, { gender: '남성', age: '40대' }];
const NO_KEY = 'AI 키(GEMINI_API_KEY)가 서버에 없어 전단을 읽거나 방송을 만들 수 없습니다. Cloudflare → Workers → maket-moum → 설정 → 변수 및 비밀에 GEMINI_API_KEY를 넣어 주세요.';
const REWRITE_EXAMPLES = ['가격 넣어 줘', '더 짧게', '더 신나게', '가격 강조', '후크 넣기', '혜택 쉽게 풀어서', '마무리 멘트로'];
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
  // 배경음악: AI가 매번 새로 작곡 / 직접 고른 음악 파일 (Suno 등으로 만든 매장 음악)
  const [musicSource, setMusicSource] = useState<'ai' | 'file'>('ai');
  const [musicFile, setMusicFile] = useState<{ name: string; buf: AudioBuffer } | null>(null);
  const musicFileRef = useRef<HTMLInputElement>(null);
  const pickMusicFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 30 * 1048576) return onError('음악 파일이 너무 큽니다. 30MB 이하로 골라 주세요.');
    try {
      setMusicFile({ name: f.name, buf: await decodeMusicFile(f) });
      setMusicSource('file');
    } catch {
      onError('이 음악 파일을 읽지 못했습니다. mp3·wav·m4a 파일로 골라 주세요.');
    }
  };
  const useFile = withMusic && musicSource === 'file';
  const [pace, setPace] = useState<Pace>('brisk'); // 기본은 템포 있게
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>('natural');
  const [editing, setEditing] = useState<string | null>(null);
  // 추가 요청사항: 원고 작가에게 주는 지시. 같은 기기에서는 마지막에 쓴 것을 기억한다
  const [note, saveNote] = useBroadcastNote();
  // 첨부한 전단은 바로 읽지 않고 기다린다 → 추가 지시사항을 적은 뒤 "인식하고 원고 만들기"에서 지시대로 인식
  const [pending, setPending] = useState<File[]>([]);
  // 원고를 쓸 때 넘긴 상품 (상품·가격이 원고에 다 들어갔는지 점검용)
  const [scriptItems, setScriptItems] = useState<{ items: FlyerItem[]; all: boolean }>({ items: [], all: false });
  const [step, setStep] = useState<Step>(startInLibrary ? 'library' : 'setup');
  const [busy, setBusy] = useState(false);
  const [script, setScript] = useState<BroadcastScript | null>(null);
  const [progress, setProgress] = useState<Progress>({ voice: 0, voices: 0, music: 'off', mixing: 'waiting' });
  const [result, setResult] = useState<Result | null>(null);
  const [library, setLibrary] = useState<SavedBroadcast[]>([]);
  // 같은 원고·목소리는 다시 만들지 않는다 (요금 절약, 고친 단락만 새로)
  const speechCache = useRef(new Map<string, AudioBuffer>());
  // AI가 쓴 대사 (이것과 다른 대사 = 담당자가 직접 고친 대사 → 원고를 다시 써도 그대로 살린다)
  const aiLines = useRef(new Set<string>());
  const rememberAi = (segs: BroadcastSegment[]) => segs.forEach(seg => seg.lines.forEach(l => aiLines.current.add(l.text.trim())));
  const editedLines = () => (script?.segments ?? []).flatMap((seg, si) => seg.lines
    .filter(l => l.text.trim() && !aiLines.current.has(l.text.trim()))
    .map(l => ({ si, who: l.who, text: l.text.trim() })));
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
  const pickFlyers = (files: FileList | null) => {
    const list = [...(files ?? [])].filter(f => f.type.startsWith('image/') || isPdf(f));
    if (!list.length && files?.length) onError('사진(jpg·png 등)이나 PDF 파일만 올릴 수 있습니다.');
    if (list.length) setPending(p => [...p, ...list].slice(0, 4));
  };

  /** 기다리던 전단을 추가 지시사항대로 인식해 상품 목록에 넣고, 새로 읽은 상품을 돌려준다 */
  const recognizePending = async (): Promise<FlyerItem[]> => {
    const files = pending;
    if (!files.length) return [];
    setReading(files.length);
    const found: FlyerItem[] = [];
    for (const f of files) {
      try {
        const r = await api<VisionFlyerResult>('/ai/vision', { mode: 'flyer', image: await flyerFileToDataUrl(f, FLYER_MAX_SIDE), note: note.trim() || undefined });
        if (!r.items.length) onError(note.trim() ? `${f.name}에서 지시사항에 맞는 행사상품을 찾지 못했습니다.` : '전단에서 행사상품을 찾지 못했습니다. 더 가까이, 밝은 곳에서 찍은 사진으로 다시 해 주세요.');
        found.push(...r.items);
      } catch (e) {
        onError((e as Error).message);
      } finally {
        setReading(n => n - 1);
      }
    }
    setPending([]);
    addItems(found);
    return found;
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

  const writeScript = async (keepEdits = false) => {
    if (!aiEnabled) return onError(NO_KEY);
    if (!chosen.length && !pending.length) return onError('방송할 행사상품을 한 개 이상 넣어 주세요. 전단을 첨부하거나 한 줄로 입력해 주세요.');
    setBusy(true);
    try {
      // 1) 기다리던 전단이 있으면 먼저 지시사항대로 인식 → 2) 원고 작성
      const fresh = await recognizePending();
      const same = (a: FlyerItem, b: FlyerItem) => a.name.replace(/\s+/g, '') === b.name.replace(/\s+/g, '') && (a.spec ?? '') === (b.spec ?? '');
      const use = [...chosen, ...fresh.filter(f => !chosen.some(c => same(c, f)))];
      if (!use.length) return onError('방송할 행사상품이 없습니다. 지시사항을 확인하거나 다른 전단을 올려 주세요.');
      const s = await api<BroadcastScript>('/ai/broadcast/script', {
        items: use.map(({ name, code, spec, price, originalPrice, condition, period }) => ({ name, code, spec, price, originalPrice, condition, period })),
        seconds, theme, hosts, pace, voiceStyle, note: note.trim() || undefined,
        keep: keepEdits ? editedLines() : undefined,
      });
      aiLines.current.clear();
      rememberAi(s.segments);
      setScript(s);
      setScriptItems({ items: use, all: !note.trim() });
      setStep('script');
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const editLine = (si: number, li: number, patch: Partial<BroadcastSegment['lines'][number]>) =>
    setScript(s => s && { ...s, segments: s.segments.map((seg, i) => (i !== si ? seg : { lines: seg.lines.map((l, j) => (j === li ? { ...l, ...patch } : l)) })) });
  // ---- 원고 부분 수정: 단락 순서·추가·삭제, 대사 추가·삭제, 한 단락만 AI로 다시 쓰기 ----
  const setSegments = (fn: (segs: BroadcastSegment[]) => BroadcastSegment[]) => setScript(s => s && { ...s, segments: fn(s.segments) });
  const moveSeg = (si: number, d: -1 | 1) => setSegments(segs => {
    const j = si + d;
    if (j < 0 || j >= segs.length) return segs;
    const next = [...segs];
    [next[si], next[j]] = [next[j], next[si]];
    return next;
  });
  const deleteSeg = (si: number) => { if (confirm(`${si + 1}단락을 지울까요?`)) setSegments(segs => segs.filter((_, i) => i !== si)); };
  const addSeg = () => setSegments(segs => [...segs, { lines: [{ who: 0, text: '' }] }]);
  const addLine = (si: number) => setSegments(segs => segs.map((seg, i) => (i !== si ? seg : { lines: [...seg.lines, { who: (seg.lines.at(-1)?.who === 0 && (script?.hosts.length ?? 1) > 1 ? 1 : 0) as 0 | 1, text: '' }] })));
  const deleteLine = (si: number, li: number) => setSegments(segs => segs.map((seg, i) => (i !== si ? seg : { lines: seg.lines.filter((_, j) => j !== li) })).filter(seg => seg.lines.length));
  const [rewriting, setRewriting] = useState<{ si: number; instruction: string; busy: boolean } | null>(null);
  const rewriteSeg = async () => {
    if (!script || !rewriting) return;
    if (!aiEnabled) return onError(NO_KEY);
    const { si, instruction } = rewriting;
    const text = (seg?: BroadcastSegment) => seg?.lines.map(l => l.text).join(' ') ?? '';
    setRewriting({ ...rewriting, busy: true });
    try {
      const fresh = await api<BroadcastSegment>('/ai/broadcast/rewrite', {
        lines: script.segments[si].lines, instruction: instruction.trim() || undefined, hosts: script.hosts,
        before: text(script.segments[si - 1]), after: text(script.segments[si + 1]),
        items: chosen.map(({ name, code, spec, price, originalPrice, condition, period }) => ({ name, code, spec, price, originalPrice, condition, period })),
      });
      rememberAi([fresh]);
      setSegments(segs => segs.map((seg, i) => (i === si ? fresh : seg)));
      setRewriting(null);
    } catch (e) {
      onError((e as Error).message);
      setRewriting(r => r && { ...r, busy: false });
    }
  };
  const openSaved = (b: SavedBroadcast) => {
    if (!b.script) return onError('예전에 만든 방송이라 원고가 저장되어 있지 않습니다. 새로 만든 방송부터 원고를 다시 열 수 있어요.');
    aiLines.current.clear();
    const edited = new Set(b.edited ?? []);
    rememberAi(b.script.segments.map(seg => ({ lines: seg.lines.filter(l => !edited.has(l.text.trim())) })));
    setScript(b.script);
    if (b.target) setSeconds(b.target);
    setStep('script');
  };

  const make = async () => {
    if (!script) return;
    const segments = script.segments
      .map(s => ({ lines: s.lines.map(l => ({ ...l, text: l.text.trim() })).filter(l => l.text) }))
      .filter(s => s.lines.length);
    if (!segments.length) return onError('원고가 비어 있습니다.');
    setStep('making');
    setResult(null);
    if (useFile && !musicFile) { setStep('script'); return onError('배경음악으로 쓸 음악 파일을 골라 주세요.'); }
    // 긴 단락은 몇 대사씩 나눠 음성을 만든다 (한 번에 보내면 서버 한도를 넘는 뒷부분 대사가 빠짐)
    const chunks = segments.map(seg => seg.lines.reduce<BroadcastSegment['lines'][]>((acc, l) => {
      const last = acc.at(-1);
      if (last && last.length < SPEECH_CHUNK_LINES && last.reduce((n, x) => n + x.text.length, 0) + l.text.length <= SPEECH_CHUNK_CHARS) last.push(l);
      else acc.push([l]);
      return acc;
    }, []));
    const jobs = chunks.flatMap((cs, si) => cs.map((lines, ci) => ({ si, ci, lines })));
    setProgress({ voice: 0, voices: jobs.length, music: withMusic ? 'making' : 'off', mixing: 'waiting' });

    const musicKey = `${script.music}|${seconds}`;
    const musicJob: Promise<AudioBuffer | null> = !withMusic ? Promise.resolve(null)
      : useFile ? Promise.resolve(musicFile!.buf)
      : musicCache.current.has(musicKey) ? Promise.resolve(musicCache.current.get(musicKey)!)
      : api<BroadcastMusic>('/ai/broadcast/music', { music: script.music, seconds })
        .then(m => decodeMusic(m.audio))
        .then(buf => { musicCache.current.set(musicKey, buf); return buf; });
    musicJob.then(m => setProgress(p => ({ ...p, music: m ? 'done' : 'off' })), () => setProgress(p => ({ ...p, music: 'failed' })));

    try {
      const parts: AudioBuffer[][] = chunks.map(cs => new Array(cs.length));
      let next = 0;
      const worker = async () => {
        while (next < jobs.length) {
          const { si, ci, lines } = jobs[next++];
          const key = JSON.stringify([script.hosts, script.voiceStyle, script.tone, script.pace, lines]);
          let buf = speechCache.current.get(key);
          if (!buf) {
            const r = await api<BroadcastSpeech>('/ai/broadcast/speech', { lines, hosts: script.hosts, tone: script.tone, pace: script.pace, voiceStyle: script.voiceStyle });
            buf = pcmToBuffer(r.audio, r.sampleRate);
            speechCache.current.set(key, buf);
          }
          parts[si][ci] = buf;
          setProgress(p => ({ ...p, voice: p.voice + 1 }));
        }
      };
      await Promise.all(Array.from({ length: Math.min(SPEECH_PARALLEL, jobs.length) }, worker));
      const voices = parts.map(ps => joinBuffers(ps));

      const music = await musicJob.catch(() => null); // 음악이 안 되면 음성만으로
      setProgress(p => ({ ...p, mixing: 'making' }));
      const mixed = await mixBroadcast(voices, music, seconds);
      const mp3 = await toMp3(mixed);
      const wav = toWav(mixed);
      const secs = Math.round(mixed.duration);
      const saved = await saveBroadcast({ id: crypto.randomUUID(), script: { ...script, segments }, edited: editedLines().map(l => l.text), target: seconds, title: script.title, theme: script.theme, hosts: [...script.hosts.map(hostLabel), ...(script.voiceStyle === 'lively' ? ['활기찬 목소리'] : [])].join(' · '), seconds: secs, createdAt: Date.now(), mp3 });
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
                  <label className="block text-[11px] font-semibold text-slate-500 space-y-0.5">혜택<input className={field} value={it.condition ?? ''} onChange={e => editItem(it.key, { condition: e.target.value || undefined })} maxLength={200} placeholder="행사카드 50% + 수산대전 20%" /></label>
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
            <input ref={albumRef} type="file" accept={FLYER_FILE_ACCEPT} multiple hidden onChange={e => { pickFlyers(e.target.files); e.target.value = ''; }} />
            {pending.length > 0 && (
              <div className="space-y-1.5 rounded-xl bg-pink-50 px-3 py-2.5">
                <p className="text-xs font-bold text-pink-700">첨부한 전단 {pending.length}개 · 아래 지시사항을 적고 "인식하고 원고 만들기"를 누르세요</p>
                {pending.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <Paperclip className="size-3.5 shrink-0 text-pink-500" /><span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <button type="button" onClick={() => setPending(p => p.filter((_, j) => j !== i))} aria-label={`${f.name} 빼기`} className="rounded p-1 text-slate-400"><X className="size-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => void recognizePending()} disabled={reading > 0} className="text-xs font-semibold text-pink-700 underline underline-offset-2 disabled:opacity-50">원고 없이 상품만 먼저 인식하기</button>
              </div>
            )}
            <BroadcastNote note={note} onChange={saveNote} />
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
            <div className="space-y-1.5 rounded-2xl bg-white p-3.5">
              <span className="text-xs font-bold text-slate-500">목소리 느낌</span>
              <div className="flex flex-wrap gap-2">{VOICE_STYLES.map(v => <Chip key={v.id} active={voiceStyle === v.id} onClick={() => setVoiceStyle(v.id)}>{v.id === 'lively' ? `🎉 ${v.label}` : v.label}</Chip>)}</div>
              {voiceStyle === 'lively' && <p className="text-xs text-pink-700">밝고 통통 튀는 목소리로 바꾸고, 처음부터 끝까지 텐션 높게 진행합니다.</p>}
            </div>
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
              <span className="text-sm"><span className="font-semibold text-slate-900">배경음악 넣기</span><span className="block text-xs text-slate-500">목소리보다 항상 작게 깔리고, 말할 때는 더 줄어듭니다.</span></span>
            </label>
            {withMusic && (
              <div className="space-y-2 rounded-2xl bg-white p-3.5">
                <div className="flex flex-wrap gap-2">
                  <Chip active={musicSource === 'ai'} onClick={() => setMusicSource('ai')}>🎵 AI가 새로 작곡 (매번 다른 곡)</Chip>
                  <Chip active={musicSource === 'file'} onClick={() => (musicFile ? setMusicSource('file') : musicFileRef.current?.click())}>📁 내 음악 파일</Chip>
                </div>
                {musicSource === 'ai'
                  ? <p className="text-xs text-slate-500">밝고 경쾌한 마트 광고 음악으로, 만들 때마다 조성·빠르기·악기를 바꿔 새 곡을 만듭니다.</p>
                  : <div className="flex items-center gap-2 text-sm">
                      <Music className="size-4 shrink-0 text-pink-600" />
                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{musicFile?.name ?? '선택한 파일 없음'}</span>
                      <button type="button" onClick={() => musicFileRef.current?.click()} className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">바꾸기</button>
                    </div>}
                {musicSource === 'file' && <p className="text-xs text-slate-500">Suno 등으로 직접 만든 음악(mp3·wav)을 깝니다. 방송보다 짧으면 이어 붙여 반복합니다. 매장에서 틀어도 되는 음악인지 꼭 확인해 주세요.</p>}
                <input ref={musicFileRef} type="file" accept="audio/*,.mp3,.wav,.m4a" hidden onChange={e => { void pickMusicFile(e.target.files?.[0]); e.target.value = ''; }} />
              </div>
            )}
          </section>

          <button type="button" onClick={() => void writeScript()} disabled={busy || (!chosen.length && !pending.length)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 py-3.5 text-[15px] font-bold text-white active:bg-pink-700 disabled:opacity-50">
            {busy ? <><Loader2 className="size-5 animate-spin" />{reading > 0 ? '지시사항대로 전단 인식 중…' : '쇼호스트 원고 쓰는 중…'}</> : <><Wand2 className="size-5" />{pending.length ? '전단 인식하고 원고 만들기' : '방송 원고 만들기'}</>}
          </button>
        </>}

        {step === 'script' && script && <>
          <section className="space-y-1.5">
            <input className={cx(field, 'font-bold')} value={script.title} onChange={e => setScript({ ...script, title: e.target.value })} maxLength={40} aria-label="방송 제목" />
            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
              <span className="rounded bg-pink-100 px-2 py-0.5 text-pink-700">{script.theme}</span>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-slate-700">{lengthLabel(seconds)} 목표</span>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-slate-700">말 빠르기 {paceOf(script.pace).label}</span>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-slate-700">목소리 {voiceStyleLabel(script.voiceStyle ?? 'natural')}</span>
              {script.hosts.map((h, i) => <span key={i} className={cx('rounded px-2 py-0.5', script.hosts.length > 1 ? HOST_TONE[i] : 'bg-slate-200 text-slate-700')}>{hostLabel(h)} 쇼호스트</span>)}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Pencil className="size-4" />방송 원고</h2>
              <p className="text-xs text-slate-500">글자를 눌러 바로 고치거나, ✨다시 쓰기로 한 단락만 AI에게 다시 맡길 수 있습니다. 고친 단락만 음성을 새로 만듭니다.{script.hosts.length > 1 && ' 진행자 이름표를 누르면 말하는 사람이 바뀝니다.'}</p>
            </div>
            {scriptItems.items.length > 0 && (() => {
              const gaps = scriptGaps(script.segments, scriptItems.items, scriptItems.all);
              return gaps.length === 0
                ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">✓ {scriptItems.all ? `행사상품 ${scriptItems.items.length}개 모두` : '원고에 나온 상품 모두'} 가격까지 들어갔어요</p>
                : (
                  <div className="space-y-1 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                    <p className="font-bold">확인해 주세요 · 빠진 상품·가격 {gaps.length}개</p>
                    {gaps.map(g => <p key={g.name}>• {g.name}: {g.problem === 'missing' ? '원고에 없음' : `가격(${koreanNumber(g.price!)} 원)이 안 나옴`}</p>)}
                    <p className="text-amber-700">해당 단락을 직접 고치거나 ✨다시 쓰기에 "가격 넣어 줘"라고 지시해 주세요.</p>
                  </div>
                );
            })()}
            {script.segments.map((seg, si) => (
              <div key={si} className="space-y-2 rounded-2xl bg-white p-3">
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                  <span className="mr-auto">{si + 1}단락</span>
                  <button type="button" onClick={() => setRewriting(r => (r?.si === si ? null : { si, instruction: '', busy: false }))} className={cx('flex items-center gap-1 rounded-lg px-2 py-1 font-bold', rewriting?.si === si ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-700')}><Sparkles className="size-3.5" />다시 쓰기</button>
                  <button type="button" onClick={() => moveSeg(si, -1)} disabled={si === 0} aria-label={`${si + 1}단락 위로`} className="rounded-lg p-1.5 text-slate-500 active:bg-slate-100 disabled:opacity-30"><ChevronUp className="size-4" /></button>
                  <button type="button" onClick={() => moveSeg(si, 1)} disabled={si === script.segments.length - 1} aria-label={`${si + 1}단락 아래로`} className="rounded-lg p-1.5 text-slate-500 active:bg-slate-100 disabled:opacity-30"><ChevronDown className="size-4" /></button>
                  <button type="button" onClick={() => deleteSeg(si)} disabled={script.segments.length === 1} aria-label={`${si + 1}단락 지우기`} className="rounded-lg p-1.5 text-slate-400 active:bg-slate-100 disabled:opacity-30"><Trash2 className="size-4" /></button>
                </div>
                {(!hasBrand(seg) || hasPlaceMention(seg)) && (
                  <div className="flex flex-wrap gap-x-3 text-xs font-semibold">
                    {!hasBrand(seg) && <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="size-3.5" />"{BRAND}"를 넣어 주세요</span>}
                    {hasPlaceMention(seg) && <span className="flex items-center gap-1 text-red-600"><AlertTriangle className="size-3.5" />점포명·매대 위치는 빼 주세요 (공용 방송)</span>}
                  </div>
                )}
                {rewriting?.si === si && (
                  <div className="space-y-2 rounded-xl bg-pink-50 p-2.5">
                    <input className={field} value={rewriting.instruction} onChange={e => setRewriting({ ...rewriting, instruction: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void rewriteSeg(); } }} maxLength={200} placeholder="어떻게 고칠까요? (비우면 더 생동감 있게)" aria-label={`${si + 1}단락 다시 쓰기 지시`} />
                    <div className="flex flex-wrap gap-1.5">
                      {REWRITE_EXAMPLES.map(x => <button key={x} type="button" onClick={() => setRewriting({ ...rewriting, instruction: x })} className="rounded-full border border-pink-200 bg-white px-2.5 py-1 text-xs font-semibold text-pink-700">{x}</button>)}
                    </div>
                    <button type="button" onClick={() => void rewriteSeg()} disabled={rewriting.busy} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-pink-600 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                      {rewriting.busy ? <><Loader2 className="size-4 animate-spin" />다시 쓰는 중…</> : <><Sparkles className="size-4" />이 단락만 다시 쓰기</>}
                    </button>
                  </div>
                )}
                {seg.lines.map((l, li) => (
                  <div key={li} className="space-y-1">
                    {(script.hosts.length > 1 || seg.lines.length > 1) && (
                      <div className="flex items-center">
                        {script.hosts.length > 1 && (
                          <button type="button" onClick={() => editLine(si, li, { who: l.who === 0 ? 1 : 0 })} className={cx('rounded px-2 py-0.5 text-xs font-bold', HOST_TONE[l.who])}>
                            진행자 {l.who + 1} · {hostLabel(script.hosts[l.who])}
                          </button>
                        )}
                        {seg.lines.length > 1 && <button type="button" onClick={() => deleteLine(si, li)} aria-label={`${si + 1}단락 ${li + 1}번째 대사 지우기`} className="ml-auto rounded p-1 text-slate-300 active:text-slate-500"><X className="size-4" /></button>}
                      </div>
                    )}
                    <textarea rows={Math.min(6, Math.max(2, Math.ceil(l.text.length / 30)))} className={cx(field, 'resize-none')} value={l.text} onChange={e => editLine(si, li, { text: e.target.value })} maxLength={300} placeholder="대사를 입력하세요" aria-label={`${si + 1}단락 ${li + 1}번째 대사`} />
                  </div>
                ))}
                <button type="button" onClick={() => addLine(si)} className="flex items-center gap-1 text-xs font-semibold text-slate-500"><Plus className="size-3.5" />대사 추가</button>
              </div>
            ))}
            <button type="button" onClick={addSeg} className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-white py-3 text-sm font-bold text-slate-600"><Plus className="size-4" />단락 추가</button>
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

          {editedLines().length > 0 && <p className="rounded-xl bg-pink-50 px-3 py-2 text-xs text-pink-800">직접 고친 문구 {editedLines().length}곳은 "다시 쓰기"를 눌러도 그대로 남깁니다. 고친 원고 그대로 방송을 만들려면 오른쪽 버튼을 누르세요.</p>}
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button type="button" onClick={() => void writeScript(true)} disabled={busy} className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-pink-200 bg-white px-4 py-3.5 text-sm font-bold text-pink-700 disabled:opacity-50">
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
            <Row icon={<Mic className="size-4" />} label={`쇼호스트 음성 ${progress.voice} / ${progress.voices}`} state={progress.voice >= progress.voices ? 'done' : 'making'} />
            {progress.music !== 'off' && <Row icon={<Music className="size-4" />} label={progress.music === 'failed' ? '배경음악 실패 · 음성만으로 만듭니다' : useFile ? '내 음악 파일 깔기' : '배경음악 작곡'} state={progress.music} />}
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
            <button type="button" onClick={() => { musicCache.current.clear(); void make(); }} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-bold text-slate-700">{withMusic && !useFile ? <><Music className="size-4" />음악 새로 만들기</> : <><RotateCw className="size-4" />다시 만들기</>}</button>
          </div>
        </>}

        {step === 'library' && <Library items={library} onChange={() => void listBroadcasts().then(setLibrary)} onShare={share} onEdit={openSaved} />}
      </div>
    </div>
  );
}

/** 이 기기에 저장된 방송: 다시 듣기·MP3 다운로드·공유·삭제 */
function Library({ items, onChange, onShare, onEdit }: { items: SavedBroadcast[]; onChange: () => void; onShare: (b: Blob, name: string) => Promise<void>; onEdit: (b: SavedBroadcast) => void }) {
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
          {b.script && <button type="button" onClick={() => onEdit(b)} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700"><Pencil className="size-4" />원고 열어 고치기</button>}
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
