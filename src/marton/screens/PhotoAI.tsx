import { useRef, useState } from 'react';
import { Camera, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import type { Promotion, VisionFlyerResult, VisionResult } from '../shared';
import { api, detectBarcode, fileToDataUrl } from '../api';
import { cx, primaryBtn, won, type Draft } from '../ui';

type Mode = VisionResult['mode'];
const MODES: { mode: Mode; label: string; hint: string }[] = [
  { mode: 'flyer', label: '행사 전단', hint: '전단을 촬영하면 행사상품·가격·기간을 추출합니다.' },
  { mode: 'price', label: '가격표', hint: '가격표를 촬영하면 시스템 가격과 비교합니다.' },
  { mode: 'barcode', label: '바코드', hint: '바코드를 촬영하면 상품과 위치를 찾습니다.' },
];

export default function PhotoAI({ aiEnabled, onRequest, onError, onToast }: {
  aiEnabled: boolean; onRequest: (d: Draft) => void; onError: (m: string) => void; onToast: (m: string) => void;
}) {
  const [mode, setMode] = useState<Mode>('flyer');
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const image = await fileToDataUrl(file);
      setPreview(image);
      const barcode = mode === 'barcode' ? await detectBarcode(file) : null;
      setResult(await api<VisionResult>('/ai/vision', barcode ? { mode, barcode } : { mode, image }));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const savePromotions = async (r: VisionFlyerResult) => {
    try {
      const added = await api<Promotion[]>('/promotions', { items: r.items });
      onToast(`행사상품 ${added.length}건을 등록했습니다.`);
    } catch (e) {
      onError((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
        {MODES.map(m => (
          <button key={m.mode} onClick={() => { setMode(m.mode); setResult(null); setPreview(null); }} className={cx('flex-1 rounded-lg py-2 text-sm font-semibold', mode === m.mode ? 'bg-white shadow-sm' : 'text-slate-600')}>
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-500">{MODES.find(m => m.mode === mode)!.hint}</p>
      {!aiEnabled && mode !== 'barcode' && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">서버에 AI 키가 설정되지 않아 사진 분석이 비활성화되어 있습니다.</p>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
      <button onClick={() => fileRef.current?.click()} disabled={busy} className={cx(primaryBtn, 'flex items-center justify-center gap-2 py-5')}>
        <Camera className="size-5" />{busy ? 'AI 분석 중…' : '촬영하기'}
      </button>

      {preview && <img src={preview} alt="촬영한 사진" className="max-h-64 w-full rounded-2xl object-contain bg-slate-900" />}

      {result?.mode === 'flyer' && (
        <div className="space-y-2">
          {result.items.length === 0 && <p className="text-sm text-slate-500">행사상품을 찾지 못했습니다.</p>}
          {result.items.map((it, i) => (
            <div key={i} className="rounded-xl bg-white px-3.5 py-3 text-sm">
              <div className="flex justify-between font-bold"><span>{it.name}</span><span className="text-pink-600">{won(it.price)}</span></div>
              <div className="mt-0.5 text-xs text-slate-500">
                {it.originalPrice ? <s className="mr-1.5">{won(it.originalPrice)}</s> : null}{it.condition} {it.period}
              </div>
            </div>
          ))}
          {result.items.length > 0 && (
            <button onClick={() => savePromotions(result)} className="w-full rounded-xl bg-pink-600 py-3 text-sm font-bold text-white">행사상품으로 등록 (전 직원 공유)</button>
          )}
        </div>
      )}

      {result?.mode === 'price' && (
        <div className={cx('rounded-2xl p-4', result.verdict === 'ok' ? 'bg-emerald-50' : result.verdict === 'mismatch' ? 'bg-red-50' : 'bg-slate-100')}>
          <div className="flex items-center gap-2 font-bold">
            {result.verdict === 'ok' ? <CheckCircle2 className="size-5 text-emerald-600" /> : result.verdict === 'mismatch' ? <AlertTriangle className="size-5 text-red-600" /> : <HelpCircle className="size-5 text-slate-500" />}
            {result.message}
          </div>
          {result.matched && <p className="mt-1 text-sm text-slate-600">인식 상품: {result.matched.name} ({result.matched.dept})</p>}
          {result.verdict === 'mismatch' && result.matched && (
            <button
              onClick={() => onRequest({ toDept: result.matched!.dept, category: '가격 오류', title: `${result.matched!.name} 가격표 오류`, detail: result.message, location: `${result.matched!.corner} ${result.matched!.shelf}` })}
              className="mt-3 w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white"
            >
              {result.matched.dept}에 가격 오류 요청 보내기
            </button>
          )}
        </div>
      )}

      {result?.mode === 'barcode' && (
        <div className="rounded-2xl bg-white p-4">
          <div className="text-xs font-semibold text-slate-500">바코드 {result.barcode || '판독 실패'}{result.guessName ? ` · ${result.guessName}` : ''}</div>
          <div className="mt-1 font-bold text-slate-900">{result.message}</div>
        </div>
      )}
    </div>
  );
}
