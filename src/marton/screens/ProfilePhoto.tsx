import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Camera, Crop, Download, ImagePlus, Loader2, RotateCw, Share2, Sparkles, UserRound } from 'lucide-react';
import { api } from '../api';
import { toJpeg } from '../camera';
import { cx } from '../ui';
import {
  PROFILE_BACKGROUNDS, PROFILE_OUTFITS, PROFILE_RETOUCH, PROFILE_USES, profileUse,
  type ProfileBackground, type ProfileFace, type ProfileOutfit, type ProfileRetouch, type ProfilePhotoResult, type ProfileUse,
} from '../profile';
import { downloadBlob } from '../broadcast-library';

// 인물 사진 → 상반신 프로필 사진
// - AI 프로필: 얼굴·머리·체형은 그대로, 배경·구도·조명만 정리 (Gemini 이미지 편집)
// - 원본 그대로 자르기: 원본 픽셀을 그대로 잘라 얼굴이 1픽셀도 바뀌지 않는다
type Mode = 'ai' | 'crop';
type Picked = { bitmap: ImageBitmap; url: string; name: string };
const AI_MAX_SIDE = 2048; // AI에 보내는 사진 크기 (얼굴을 정확히 보도록 크게)
// 머리(정수리~턱)가 사진 높이에서 차지하는 비율과 머리 위 여백: 사원증은 허리 위 상반신, SNS는 어깨 위
const FRAMING: Record<ProfileUse, { head: number; above: number }> = { id: { head: 0.25, above: 0.07 }, sns: { head: 0.4, above: 0.14 } };

/** 머리 위치(0~1)로 상반신 자르기 영역(원본 픽셀)을 정한다. zoom이 클수록 더 가까이, dx·dy는 화면 비율만큼 옮김 */
export function cropRect(w: number, h: number, face: ProfileFace | null, use: ProfileUse, zoom: number, dx: number, dy: number) {
  const ratio = profileUse(use).ratio;
  const frame = FRAMING[use];
  const head = face?.found ? { top: face.top * h, bottom: face.bottom * h, cx: ((face.left + face.right) / 2) * w } : { top: h * 0.12, bottom: h * 0.42, cx: w / 2 };
  const headH = Math.max(1, head.bottom - head.top);
  let ch = headH / (frame.head * zoom);
  let cw = ch * ratio;
  // 원본보다 크면 원본 안에 들어오게 줄인다 (비율 유지)
  const fit = Math.min(1, w / cw, h / ch);
  ch *= fit; cw *= fit;
  let x = head.cx - cw / 2 + dx * cw;
  let y = head.top - ch * frame.above + dy * ch;
  x = Math.min(Math.max(0, x), w - cw);
  y = Math.min(Math.max(0, y), h - ch);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(cw), h: Math.round(ch) };
}

/** JPEG에 인쇄 해상도(dpi)를 적는다 (JFIF 머리글). 사원증 가이드라인: 300dpi 이상 */
export async function withDpi(blob: Blob, dpi = 300): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const jfif = bytes[2] === 0xff && bytes[3] === 0xe0 && String.fromCharCode(...bytes.slice(6, 10)) === 'JFIF';
  if (!jfif) return blob;
  bytes[13] = 1; // 단위: 인치
  bytes[14] = dpi >> 8; bytes[15] = dpi & 0xff;
  bytes[16] = dpi >> 8; bytes[17] = dpi & 0xff;
  return new Blob([bytes], { type: 'image/jpeg' });
}

/** 사진 가운데를 비율에 맞춰 자르고, 최소 크기보다 작으면 키운다 (AI 결과를 54×86mm 비율로 맞출 때) */
function fitToRatio(img: CanvasImageSource, w: number, h: number, ratio: number, minW: number, minH: number) {
  let cw = w, ch = h;
  if (w / h > ratio) cw = h * ratio; else ch = w / ratio;
  const scale = Math.max(1, minW / cw, minH / ch);
  const c = document.createElement('canvas');
  c.width = Math.round(cw * scale); c.height = Math.round(ch * scale);
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, c.width, c.height);
  return c;
}

/** 흑백 사진인지: 픽셀 채도 평균이 아주 낮으면 흑백 */
function isGrayscale(bitmap: ImageBitmap) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(bitmap, 0, 0, 64, 64);
  const d = g.getImageData(0, 0, 64, 64).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
  return sum / (d.length / 4) < 6;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cx('rounded-full border px-3.5 py-2 text-sm font-semibold', active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 active:bg-slate-100')}>
      {children}
    </button>
  );
}

export default function ProfilePhoto({ aiEnabled, onClose, onError }: { aiEnabled: boolean; onClose: () => void; onError: (m: string) => void }) {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [use, setUse] = useState<ProfileUse>('id');
  const [background, setBackground] = useState<ProfileBackground>('white');
  const [outfit, setOutfit] = useState<ProfileOutfit>('keep');
  const [retouch, setRetouch] = useState<ProfileRetouch>('natural');
  const [aiError, setAiError] = useState<string | null>(null);
  // 기본: 올리면 바로 1순위 사진(흰 벽·허리 위 상반신·잡티 보정)을 AI로 만든다
  const [mode, setMode] = useState<Mode>('ai');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HTMLCanvasElement | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  // 원본 그대로 자르기
  const [face, setFace] = useState<ProfileFace | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);
  const cropCanvas = useRef<HTMLCanvasElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  // 완성되면 결과(다운로드 버튼)가 보이게 내려 준다
  useEffect(() => { if (resultUrl) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [resultUrl]);


  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return onError('사진 파일(JPG·PNG 등)을 골라 주세요.');
    try {
      const bitmap = await createImageBitmap(f);
      // 미리보기는 파일 주소 대신 그린 그림(JPEG)으로: 올린 파일 내용이 화면에 그대로 해석되지 않게
      setPicked({ bitmap, url: toJpeg(bitmap, bitmap.width, bitmap.height, 1280, 0.9), name: f.name.replace(/\.[^.]+$/, '') || '프로필' });
      setResult(null); setFace(null); setZoom(1); setDx(0); setDy(0);
      if (mode === 'crop') void findFace(bitmap);
      else void makeAi(bitmap); // 올리면 바로 만든다
    } catch {
      onError('이 사진을 열지 못했습니다. 다른 사진으로 골라 주세요.');
    }
  };

  const chooseUse = (u: ProfileUse) => {
    setUse(u);
    setBackground(PROFILE_BACKGROUNDS[u][0].id);
    if (u === 'sns') setOutfit('keep');
    setResult(null);
    setZoom(1); setDx(0); setDy(0);
  };

  const rect = useMemo(() => (picked ? cropRect(picked.bitmap.width, picked.bitmap.height, face, use, zoom, dx, dy) : null), [picked, face, use, zoom, dx, dy]);

  // 원본 그대로 자르기 미리보기: 원본 픽셀을 그대로 옮긴다 (크기만 화면에 맞게 보여 줌)
  useEffect(() => {
    if (mode !== 'crop' || !picked || !rect || !cropCanvas.current) return;
    const c = cropCanvas.current;
    c.width = rect.w; c.height = rect.h;
    c.getContext('2d')!.drawImage(picked.bitmap, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  }, [mode, picked, rect]);

  const findFace = async (bitmap = picked?.bitmap) => {
    if (!bitmap || (face && bitmap === picked?.bitmap)) return;
    if (!aiEnabled) return setFace({ found: false, top: 0, left: 0, bottom: 0, right: 0 });
    setBusy(true);
    try {
      setFace(await api<ProfileFace>('/ai/profile/face', { image: toJpeg(bitmap, bitmap.width, bitmap.height, 1024, 0.85) }));
    } catch (e) {
      onError((e as Error).message);
      setFace({ found: false, top: 0, left: 0, bottom: 0, right: 0 });
    } finally {
      setBusy(false);
    }
  };

  const makeAi = async (bitmap = picked?.bitmap) => {
    if (!bitmap) return;
    if (!aiEnabled) {
      setAiError('AI 키(GEMINI_API_KEY)가 서버에 없어 AI 프로필을 만들 수 없습니다. "원본 그대로 자르기"로 만들어 드렸습니다.');
      setMode('crop');
      return void findFace(bitmap);
    }
    setBusy(true);
    setResult(null);
    setAiError(null);
    let failed = false;
    try {
      const r = await api<ProfilePhotoResult>('/ai/profile/photo', {
        image: toJpeg(bitmap, bitmap.width, bitmap.height, AI_MAX_SIDE, 0.92), use, background, outfit, retouch,
      });
      // 54×86mm(사원증)·정사각형(SNS) 비율로 맞추고 최소 해상도 이상으로
      const img = new Image();
      img.src = r.image;
      await img.decode();
      const u = profileUse(use);
      const canvas = fitToRatio(img, img.naturalWidth, img.naturalHeight, u.ratio, u.minW, u.minH);
      setResult(canvas);
      setResultUrl(canvas.toDataURL('image/jpeg', 0.95));
    } catch (e) {
      // AI가 안 되면 바로 원본 그대로 자르기로 결과를 만들어 다운로드는 할 수 있게
      failed = true;
      setAiError((e as Error).message);
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
    if (failed) { setMode('crop'); void findFace(bitmap); }
  };

  const toBlob = (c: HTMLCanvasElement | null) => new Promise<Blob | null>(resolve => (c ? c.toBlob(resolve, 'image/jpeg', 0.95) : resolve(null)))
    .then(b => b && withDpi(b));
  const fileName = (kind: string, ext: string) => `${picked?.name ?? '프로필'}_${PROFILE_USES.find(u => u.id === use)!.label.split('·')[0]}_${kind}.${ext}`;
  const outBlob = () => toBlob(mode === 'crop' ? cropCanvas.current : result);
  const outName = () => fileName(mode === 'crop' ? '원본' : use === 'id' ? '1순위' : 'AI', 'jpg');
  const save = async () => { const b = await outBlob(); if (b) downloadBlob(b, outName()); };
  const share = async () => {
    const b = await outBlob();
    if (!b) return;
    const file = new File([b], outName(), { type: b.type });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: '프로필 사진' });
      else downloadBlob(b, file.name);
    } catch { /* 공유 취소 */ }
  };

  const ready = mode === 'crop' ? Boolean(picked && face) : Boolean(result);
  const u = profileUse(use);
  // 사원증 가이드라인 점검 (원본 그대로 자르기)
  const gray = useMemo(() => (picked ? isGrayscale(picked.bitmap) : false), [picked]);
  const checks = picked && rect && face ? [
    { ok: !gray, text: gray ? '흑백 사진은 쓸 수 없습니다 (컬러 사진만)' : '컬러 사진' },
    { ok: !face.found || face.top > 0.01, text: face.found && face.top <= 0.01 ? '머리 윗부분이 잘린 사진입니다 — 머리 전체가 나오게 다시 찍어 주세요' : '머리 전체가 보임' },
    { ok: rect.w >= u.minW && rect.h >= u.minH, text: rect.w >= u.minW && rect.h >= u.minH ? `해상도 충분 (${rect.w}×${rect.h})` : `해상도 부족: ${rect.w}×${rect.h} (${use === 'id' ? '300dpi 기준 ' : ''}${u.minW}×${u.minH} 이상 필요) — 더 가까이 또는 고화질로 찍어 주세요` },
  ] : [];

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-50" role="dialog" aria-modal="true" aria-label="프로필 사진 만들기">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white px-3 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} disabled={busy} aria-label="뒤로" className="rounded-lg p-2 text-slate-600 active:bg-slate-100 disabled:opacity-40"><ArrowLeft className="size-5" /></button>
        <UserRound className="size-5 shrink-0 text-indigo-600" />
        <h1 className="min-w-0 flex-1 truncate text-[16px] font-bold text-slate-900">프로필 사진 만들기</h1>
      </div>

      <div className="mx-auto max-w-lg space-y-4 p-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <section className="space-y-2">
          <h2 className="font-bold text-slate-800">1. 인물 사진</h2>
          {picked ? (
            <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
              <img src={picked.url} alt="올린 사진" className="h-24 w-20 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1 text-sm text-slate-600">
                <p className="truncate font-semibold text-slate-800">{picked.name}</p>
                <p>{picked.bitmap.width} × {picked.bitmap.height}</p>
              </div>
              <button type="button" onClick={() => albumRef.current?.click()} disabled={busy} className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600">바꾸기</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-indigo-200 bg-white py-6 font-bold text-indigo-700"><Camera className="size-7" />사진 찍기</button>
              <button type="button" onClick={() => albumRef.current?.click()} className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-indigo-200 bg-white py-6 font-bold text-indigo-700"><ImagePlus className="size-7" />앨범에서 고르기</button>
            </div>
          )}
          <p className="text-xs text-slate-500">얼굴이 정면으로 또렷하게, 밝은 곳에서 찍은 사진일수록 똑같이 나옵니다. 사진은 이 기기와 AI 처리에만 쓰고 서버에 보관하지 않습니다.</p>
          <input ref={cameraRef} type="file" accept="image/*" capture="user" hidden onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
          <input ref={albumRef} type="file" accept="image/*" hidden onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-slate-800">2. 용도</h2>
          <div className="flex flex-wrap gap-2">{PROFILE_USES.map(x => <Chip key={x.id} active={use === x.id} onClick={() => chooseUse(x.id)}>{x.label} <span className="opacity-70">{x.size}</span></Chip>)}</div>
          {use === 'id' && <p className="text-xs text-slate-500">사원증 가이드라인: 54×86mm · 300dpi 이상(638×1016픽셀) · 허리 위 상반신 · 흰 배경 · 자연스러운 표정 · 컬러 사진만 · 과한 보정·필터·이미지 합성 불가</p>}
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-slate-800">3. 만드는 방식</h2>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode('ai')} aria-pressed={mode === 'ai'} className={cx('rounded-2xl border-2 p-3 text-left', mode === 'ai' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white')}>
              <span className="flex items-center gap-1 font-bold text-slate-900"><Sparkles className="size-4 text-indigo-600" />{use === 'id' ? '1순위 사진 자동' : 'AI 프로필'}<span className="rounded bg-emerald-100 px-1.5 text-xs text-emerald-700">추천</span></span>
              <span className="mt-1 block text-xs text-slate-600">{use === 'id' ? '흰 벽 배경 · 허리 위 상반신 · 잡티 자동 보정' : '얼굴은 그대로, 배경·조명 정리 · 잡티 자동 보정'}</span>
            </button>
            <button type="button" onClick={() => { setMode('crop'); void findFace(); }} aria-pressed={mode === 'crop'} className={cx('rounded-2xl border-2 p-3 text-left', mode === 'crop' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white')}>
              <span className="flex items-center gap-1 font-bold text-slate-900"><Crop className="size-4 text-indigo-600" />원본 그대로 자르기</span>
              <span className="mt-1 block text-xs text-slate-600">보정 없이 원본 픽셀 그대로 상반신만 자르기 (배경도 원래대로)</span>
            </button>
          </div>
        </section>

        {mode === 'ai' && (
          <section className="space-y-3 rounded-2xl bg-white p-3">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-slate-700">배경</p>
              <div className="flex flex-wrap gap-2">{PROFILE_BACKGROUNDS[use].map(b => <Chip key={b.id} active={background === b.id} onClick={() => setBackground(b.id)}>{b.label}</Chip>)}</div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-slate-700">잡티 보정</p>
              <div className="flex flex-wrap gap-2">{PROFILE_RETOUCH.map(o => <Chip key={o.id} active={retouch === o.id} onClick={() => setRetouch(o.id)}>{o.label}</Chip>)}</div>
              {retouch === 'natural' && <p className="text-xs text-slate-500">여드름·뾰루지·작은 점 같은 일시적인 잡티와 붉은기, 잔머리, 옷 먼지만 자연스럽게 지웁니다. 피부결·특징적인 점·흉터·주름은 남겨 본인 그대로 보이게 합니다 (가이드라인: 과한 보정 불가).</p>}
            </div>
            {use === 'id' && (
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-slate-700">옷</p>
                <div className="flex flex-wrap gap-2">{PROFILE_OUTFITS.map(o => <Chip key={o.id} active={outfit === o.id} onClick={() => setOutfit(o.id)}>{o.label}</Chip>)}</div>
              </div>
            )}
            <p className="text-xs text-slate-500">얼굴 생김새·머리 모양·표정·체형은 절대 바꾸지 말라고 지시합니다(성형·필터 효과 없음). AI가 만든 사진이라 아주 작은 차이가 생길 수 있으니 아래에서 원본과 꼭 비교해 보세요.</p>
            <button type="button" onClick={() => void makeAi()} disabled={!picked || busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-[15px] font-bold text-white active:bg-indigo-700 disabled:opacity-50">
              {busy ? <><Loader2 className="size-5 animate-spin" />만드는 중… (10~30초)</> : result ? <><RotateCw className="size-5" />다시 만들기</> : <><Sparkles className="size-5" />{use === 'id' ? '1순위 사진 만들기' : 'AI 프로필 사진 만들기'}</>}
            </button>
          </section>
        )}

        {mode === 'crop' && picked && (
          <section className="space-y-3 rounded-2xl bg-white p-3">
            {busy && <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="size-4 animate-spin" />얼굴 위치를 찾는 중…</p>}
            {face && !face.found && <p className="text-xs text-amber-700">얼굴 위치를 자동으로 찾지 못했습니다. 아래에서 크기와 위치를 직접 맞춰 주세요.</p>}
            {[
              { label: '크기 (멀리 ↔ 가까이)', value: zoom, set: setZoom, min: 0.6, max: 1.8, step: 0.02, aria: '자르기 크기' },
              { label: '좌우 위치', value: dx, set: setDx, min: -0.5, max: 0.5, step: 0.01, aria: '좌우 위치' },
              { label: '위아래 위치', value: dy, set: setDy, min: -0.5, max: 0.5, step: 0.01, aria: '위아래 위치' },
            ].map(s => (
              <label key={s.aria} className="block text-xs font-semibold text-slate-600">{s.label}
                <input type="range" min={s.min} max={s.max} step={s.step} value={s.value} onChange={e => s.set(Number(e.target.value))} aria-label={s.aria} className="mt-1 w-full accent-indigo-600" />
              </label>
            ))}
            {rect && <p className="text-xs text-slate-500">원본 {rect.w} × {rect.h} 픽셀을 그대로 잘라 저장합니다(300dpi 표시). 크기를 키우거나 색을 바꾸지 않습니다.</p>}
            {checks.length > 0 && (
              <ul className="space-y-1 text-sm" aria-label="가이드라인 점검">
                {checks.map(c => <li key={c.text} className={c.ok ? 'text-emerald-700' : 'font-semibold text-red-600'}>{c.ok ? '✓' : '✗'} {c.text}</li>)}
              </ul>
            )}
          </section>
        )}

        {aiError && (
          <div role="alert" className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-bold">AI 프로필을 만들지 못했습니다</p>
            <p>{aiError}</p>
            <button type="button" onClick={() => { setMode('ai'); void makeAi(); }} disabled={busy} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-amber-800 disabled:opacity-50">AI로 다시 시도</button>
          </div>
        )}

        {picked && (mode === 'crop' ? face : result) && (
          <section ref={resultRef} className="scroll-mt-16 space-y-3">
            <h2 className="font-bold text-slate-800">결과 — 원본과 비교</h2>
            <div className="grid grid-cols-2 gap-2">
              <figure className="space-y-1">
                <img src={picked.url} alt="원본 사진" className="aspect-[54/86] w-full rounded-xl bg-slate-200 object-contain" />
                <figcaption className="text-center text-xs text-slate-500">원본</figcaption>
              </figure>
              <figure className="space-y-1">
                {mode === 'crop'
                  ? <canvas ref={cropCanvas} aria-label="자른 사진" className="aspect-[54/86] w-full rounded-xl bg-slate-200 object-contain" />
                  : <img src={resultUrl!} alt="AI 프로필 사진" className="aspect-[54/86] w-full rounded-xl bg-slate-200 object-contain" />}
                <figcaption className="text-center text-xs text-slate-500">{mode === 'crop' ? '원본 그대로 자르기' : 'AI 프로필'}</figcaption>
              </figure>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void save()} disabled={!ready} className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50"><Download className="size-4" />다운로드 (JPG)</button>
              <button type="button" onClick={() => void share()} disabled={!ready} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-bold text-slate-700 disabled:opacity-50"><Share2 className="size-4" />공유</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
