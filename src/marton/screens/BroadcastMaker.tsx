import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Download, Loader2, Megaphone, Music, Pencil, RotateCw, Wand2, Mic } from 'lucide-react';
import type { FlyerItem } from '../shared';
import {
  BROADCAST_THEMES, BROADCAST_VOICES, LENGTH_CHOICES, lengthLabel,
  type BroadcastMusic, type BroadcastScript, type BroadcastSpeech, type BroadcastTheme,
} from '../broadcast';
import { decodeMusic, mixBroadcast, pcmToBuffer, toWav } from '../broadcast-audio';
import { api } from '../api';
import { Chip, cx, inputCls, won } from '../ui';

type Item = FlyerItem & { key: string; include: boolean };
type Step = 'setup' | 'script' | 'making' | 'done';
type Progress = { voice: number; voices: number; music: 'off' | 'making' | 'done' | 'failed'; mixing: boolean };

const SPEECH_PARALLEL = 2;
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-pink-500';
const fileName = (title: string) => `${title.replace(/[\\/:*?"<>|]/g, '').trim() || '매장 방송'}.wav`;

/** 행사 매장 방송 만들기: 행사상품 → AI 원고 → 음성 + 배경음악 → 1~3분 방송 파일 */
export default function BroadcastMaker({ items: source, onClose, onError }: {
  items: FlyerItem[]; onClose: () => void; onError: (m: string) => void;
}) {
  const [items, setItems] = useState<Item[]>(() => source.map((it, i) => ({ ...it, key: `${i}-${it.name}`, include: i < 12 })));
  const [seconds, setSeconds] = useState<number>(120);
  const [theme, setTheme] = useState<BroadcastTheme>('자동');
  const [voice, setVoice] = useState<string>('auto');
  const [withMusic, setWithMusic] = useState(true);
  const [note, setNote] = useState('');
  const [step, setStep] = useState<Step>('setup');
  const [busy, setBusy] = useState(false);
  const [script, setScript] = useState<BroadcastScript | null>(null);
  const [progress, setProgress] = useState<Progress>({ voice: 0, voices: 0, music: 'off', mixing: false });
  const [result, setResult] = useState<{ url: string; blob: Blob; seconds: number; musicFailed: boolean } | null>(null);
  // 같은 원고·목소리는 다시 만들지 않는다 (요금 절약, 고친 단락만 새로)
  const speechCache = useRef(new Map<string, AudioBuffer>());
  const musicCache = useRef(new Map<string, AudioBuffer>());
  const chosen = items.filter(i => i.include);

  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  const writeScript = async () => {
    if (!chosen.length) return onError('방송할 행사상품을 한 개 이상 골라 주세요.');
    setBusy(true);
    try {
      const s = await api<BroadcastScript>('/ai/broadcast/script', {
        items: chosen.map(({ name, spec, price, originalPrice, condition, period }) => ({ name, spec, price, originalPrice, condition, period })),
        seconds, theme, voice: voice === 'auto' ? undefined : voice, note: note.trim() || undefined,
      });
      setScript(s);
      setStep('script');
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const editSegment = (i: number, t: string) => setScript(s => s && { ...s, segments: s.segments.map((x, j) => (j === i ? { text: t } : x)) });

  const make = async () => {
    if (!script) return;
    const segments = script.segments.map(s => s.text.trim()).filter(Boolean);
    if (!segments.length) return onError('원고가 비어 있습니다.');
    setStep('making');
    setResult(null);
    setProgress({ voice: 0, voices: segments.length, music: withMusic ? 'making' : 'off', mixing: false });

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
          const key = `${script.voice}|${script.tone}|${segments[i]}`;
          let buf = speechCache.current.get(key);
          if (!buf) {
            const r = await api<BroadcastSpeech>('/ai/broadcast/speech', { text: segments[i], voice: script.voice, tone: script.tone });
            buf = pcmToBuffer(r.audio, r.sampleRate);
            speechCache.current.set(key, buf);
          }
          voices[i] = buf;
          setProgress(p => ({ ...p, voice: p.voice + 1 }));
        }
      };
      await Promise.all(Array.from({ length: Math.min(SPEECH_PARALLEL, segments.length) }, worker));

      const music = await musicJob.catch(() => null); // 음악이 안 되면 음성만으로
      setProgress(p => ({ ...p, mixing: true }));
      const mixed = await mixBroadcast(voices, music, seconds);
      const blob = toWav(mixed);
      setResult({ url: URL.createObjectURL(blob), blob, seconds: Math.round(mixed.duration), musicFailed: withMusic && !music });
      setStep('done');
    } catch (e) {
      onError((e as Error).message || '방송을 만들지 못했습니다.');
      setStep('script');
    }
  };

  const download = () => {
    if (!result || !script) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = fileName(script.title);
    a.click();
  };

  const share = async () => {
    if (!result || !script) return;
    const file = new File([result.blob], fileName(script.title), { type: 'audio/wav' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: script.title });
      else download();
    } catch { /* 공유 취소 */ }
  };

  const back = () => (step === 'setup' ? onClose() : step === 'done' ? setStep('script') : step === 'script' ? setStep('setup') : undefined);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-50" role="dialog" aria-modal="true" aria-label="행사 매장 방송 만들기">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white px-3 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))]">
        <button type="button" onClick={back} disabled={step === 'making'} aria-label="뒤로" className="rounded-lg p-2 text-slate-600 active:bg-slate-100 disabled:opacity-40"><ArrowLeft className="size-5" /></button>
        <Megaphone className="size-5 text-pink-600" />
        <h1 className="text-[16px] font-bold text-slate-900">행사 매장 방송 만들기</h1>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 p-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {step === 'setup' && <>
          <section className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-slate-700">1. 방송할 행사상품</h2>
              <span className="text-xs font-semibold text-slate-500">{chosen.length} / {items.length}개</span>
            </div>
            <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-2xl bg-white">
              {items.map(it => (
                <label key={it.key} className="flex items-start gap-3 px-3.5 py-2.5">
                  <input type="checkbox" checked={it.include} onChange={e => setItems(xs => xs.map(x => (x.key === it.key ? { ...x, include: e.target.checked } : x)))} className="mt-0.5 size-5 shrink-0 accent-pink-600" />
                  <span className="min-w-0 text-sm">
                    <span className="font-semibold text-slate-900">{it.name}</span>{it.spec && <span className="text-slate-400"> {it.spec}</span>}
                    <span className="block text-xs text-slate-500">{[it.price && won(it.price), it.condition, it.period].filter(Boolean).join(' · ')}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">상품이 많으면 방송이 길고 빨라집니다. 1분이면 3~5개, 3분이면 8~12개가 듣기 좋습니다.</p>
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
            <h2 className="text-sm font-semibold text-slate-700">4. 목소리</h2>
            <div className="flex flex-wrap gap-2">{BROADCAST_VOICES.map(v => <Chip key={v.id} active={voice === v.id} onClick={() => setVoice(v.id)}>{v.label}</Chip>)}</div>
          </section>

          <section className="space-y-2">
            <label className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3">
              <input type="checkbox" checked={withMusic} onChange={e => setWithMusic(e.target.checked)} className="size-5 accent-pink-600" />
              <span className="text-sm"><span className="font-semibold text-slate-900">행사 분위기 배경음악 넣기</span><span className="block text-xs text-slate-500">AI가 새로 작곡한 연주곡을 깔고, 멘트가 나올 때는 음악을 줄입니다.</span></span>
            </label>
            <input className={inputCls} value={note} onChange={e => setNote(e.target.value)} maxLength={100} placeholder="덧붙일 말 (선택) 예: ○○점, 오후 3시까지만, 주차 2시간 무료" />
          </section>

          <button type="button" onClick={() => void writeScript()} disabled={busy || !chosen.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 py-3.5 text-[15px] font-bold text-white active:bg-pink-700 disabled:opacity-50">
            {busy ? <><Loader2 className="size-5 animate-spin" />방송 원고 쓰는 중…</> : <><Wand2 className="size-5" />방송 원고 만들기</>}
          </button>
        </>}

        {step === 'script' && script && <>
          <section className="space-y-1">
            <input className={cx(field, 'font-bold')} value={script.title} onChange={e => setScript({ ...script, title: e.target.value })} maxLength={40} aria-label="방송 제목" />
            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
              <span className="rounded bg-pink-100 px-2 py-0.5 text-pink-700">{script.theme}</span>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-slate-700">{lengthLabel(seconds)} 목표</span>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-slate-700">{BROADCAST_VOICES.find(v => v.id === script.voice)?.label ?? script.voice}</span>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Pencil className="size-4" />방송 원고</h2>
            <p className="text-xs text-slate-500">눌러서 고칠 수 있습니다. 단락 사이에는 배경음악이 잠깐 나옵니다.</p>
            {script.segments.map((s, i) => (
              <textarea key={i} rows={Math.min(8, Math.max(3, Math.ceil(s.text.length / 32)))} className={cx(field, 'resize-none')} value={s.text} onChange={e => editSegment(i, e.target.value)} maxLength={600} aria-label={`${i + 1}번째 단락`} />
            ))}
          </section>

          <details className="rounded-2xl bg-white px-3.5 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">말투·배경음악 설정 고치기</summary>
            <div className="mt-3 space-y-3">
              <label className="block space-y-1 text-xs font-semibold text-slate-500">말투 (성우 지시)
                <input className={field} value={script.tone} onChange={e => setScript({ ...script, tone: e.target.value })} maxLength={120} />
              </label>
              <div className="space-y-1 text-xs font-semibold text-slate-500">목소리
                <div className="flex flex-wrap gap-2 pt-1">{BROADCAST_VOICES.filter(v => v.id !== 'auto').map(v => <Chip key={v.id} active={script.voice === v.id} onClick={() => setScript({ ...script, voice: v.id })}>{v.label}</Chip>)}</div>
              </div>
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
            <Row icon={<Mic className="size-4" />} label={`음성 ${progress.voice} / ${progress.voices} 단락`} state={progress.voice >= progress.voices ? 'done' : 'making'} />
            {progress.music !== 'off' && <Row icon={<Music className="size-4" />} label={progress.music === 'failed' ? '배경음악 실패 · 음성만으로 만듭니다' : '배경음악 작곡'} state={progress.music} />}
            <Row icon={<Megaphone className="size-4" />} label="음성과 음악 합치기" state={progress.mixing ? 'making' : 'waiting'} />
            <p className="text-xs text-slate-500">1~2분쯤 걸립니다. 화면을 닫지 말고 기다려 주세요.</p>
          </section>
        )}

        {step === 'done' && result && script && <>
          <section className="space-y-3 rounded-2xl bg-white p-4">
            <div>
              <p className="font-bold text-slate-900">{script.title}</p>
              <p className="text-xs text-slate-500">{Math.floor(result.seconds / 60)}분 {result.seconds % 60}초 · {script.theme} · {(result.blob.size / 1048576).toFixed(1)}MB</p>
            </div>
            <audio src={result.url} controls loop className="w-full" />
            {result.musicFailed && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">배경음악을 만들지 못해 음성만 담았습니다. 잠시 후 아래 "음악 새로 만들기"를 눌러 주세요 (음성은 다시 만들지 않습니다).</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={download} className="flex items-center justify-center gap-1.5 rounded-xl bg-pink-600 py-3 text-sm font-bold text-white"><Download className="size-4" />파일 저장</button>
              <button type="button" onClick={() => void share()} className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-pink-200 bg-white py-3 text-sm font-bold text-pink-700"><Megaphone className="size-4" />방송 PC로 보내기</button>
            </div>
            <p className="text-xs text-slate-500">재생기는 반복 재생으로 되어 있습니다. 휴대폰을 방송 앰프에 연결해 틀거나, 저장한 파일을 매장 방송 PC에서 반복 재생하세요.</p>
          </section>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setStep('script')} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-bold text-slate-700"><Pencil className="size-4" />원고 고치기</button>
            <button type="button" onClick={() => { musicCache.current.clear(); void make(); }} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-bold text-slate-700">{withMusic ? <><Music className="size-4" />음악 새로 만들기</> : <><RotateCw className="size-4" />다시 만들기</>}</button>
          </div>
        </>}
      </div>
    </div>
  );
}

function Row({ icon, label, state }: { icon: ReactNode; label: string; state: 'waiting' | 'making' | 'done' | 'failed' }) {
  return (
    <div className={cx('flex items-center gap-2.5 text-sm', state === 'waiting' ? 'text-slate-400' : state === 'failed' ? 'text-amber-700' : 'text-slate-800')}>
      {state === 'making' ? <Loader2 className="size-4 animate-spin text-pink-600" /> : icon}
      <span className={cx(state === 'done' && 'font-semibold text-emerald-700')}>{label}{state === 'done' && ' ✓'}</span>
    </div>
  );
}
