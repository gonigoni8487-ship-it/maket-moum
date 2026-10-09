import { useState, type FormEvent } from 'react';
import { Camera, CheckCircle2, AlertTriangle, HelpCircle, MapPin, ScanLine, Keyboard, Send } from 'lucide-react';
import type { Product, Staff, Task, VisionBarcodeResult, VisionPriceResult, VisionResult } from '../shared';
import { api } from '../api';
import { cx, inputCls, primaryBtn, won, type Draft } from '../ui';
import CameraView from './CameraView';
import PhotoUpload from './PhotoUpload';
import FlyerUpload from './FlyerUpload';

type Mode = VisionResult['mode'];
const MODES: { mode: Mode; label: string; hint: string; button: string }[] = [
  { mode: 'price', label: '가격표', hint: '가격표를 찍으면 시스템 가격(행사가 포함)과 비교하고, 다르면 바로 가격 오류 요청을 보냅니다.', button: '가격표 촬영' },
  { mode: 'barcode', label: '바코드', hint: '바코드를 비추면 자동으로 읽어 상품·위치·가격을 보여 줍니다. 안 읽히거나 훼손됐으면 번호 입력이나 훼손 신고로 처리합니다.', button: '바코드 스캔' },
  { mode: 'flyer', label: '행사 전단', hint: '전단 사진을 올리면 상품명·판매코드·규격·금액·행사 프로모션·기간을 자동으로 읽습니다. 확인·수정 후 등록하면 전 직원 상품찾기와 가격표 확인에 바로 반영됩니다.', button: '전단 촬영' },
];

function ProductCard({ p, onRequest, photo }: { p: Product; onRequest: (d: Draft) => void; photo?: string }) {
  return (
    <div className="space-y-3 rounded-2xl bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-slate-900">{p.name}</div>
          <div className="mt-1 flex items-center gap-1 text-sm font-semibold text-blue-700"><MapPin className="size-4 shrink-0" />{p.floor} · {p.corner} · {p.shelf}</div>
        </div>
        <div className="shrink-0 text-sm font-bold">{won(p.price)}</div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{p.dept} · {p.barcode}</span>
        <button
          onClick={() => onRequest({ toDept: p.dept, category: '재고/보충', title: `${p.name} 재고/진열 확인`, location: `${p.corner} ${p.shelf}`, photos: photo ? [photo] : undefined })}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-700"
        >
          <Send className="size-3.5" />{p.dept}에 확인 요청
        </button>
      </div>
    </div>
  );
}

export default function PhotoAI({ me, aiEnabled, products, onRequest, onSent, onError, onToast }: {
  me: Staff; aiEnabled: boolean; products: Product[]; onRequest: (d: Draft) => void; onSent: (t: Task | null) => void; onError: (m: string) => void; onToast: (m: string) => void;
}) {
  const [upload, setUpload] = useState(true); // 첫 화면: 사진 올리기
  const [mode, setMode] = useState<Mode>('price');
  const [camera, setCamera] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const info = MODES.find(m => m.mode === mode)!;

  const reset = (m: Mode) => { setUpload(false); setMode(m); setResult(null); setPreview(null); setManual(false); };

  const analyze = async (body: Record<string, unknown>) => {
    setBusy(true);
    setResult(null);
    try {
      setResult(await api<VisionResult>('/ai/vision', { mode, ...body }));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // 셔터로 찍은 사진
  const onCapture = (photo: string) => {
    setCamera(false);
    setPreview(photo);
    setManual(false);
    if (aiEnabled) void analyze({ image: photo });
    else {
      setResult(null);
      if (mode === 'barcode') setManual(true); // AI 판독이 없으면 번호 입력으로
    }
  };

  // 카메라가 바코드를 읽음 → AI 없이 바로 조회
  const onBarcode = (barcode: string, photo: string) => {
    setCamera(false);
    setPreview(photo);
    setManual(false);
    setCode(barcode);
    void analyze({ barcode });
  };

  const damageReport = (photo?: string, extra?: Partial<Draft>) => onRequest({
    category: '바코드 훼손/미인식',
    title: '바코드 훼손/미인식 신고',
    detail: '계산대·스캐너에서 바코드가 읽히지 않습니다. 사진 확인 후 바코드 재부착 부탁드립니다.',
    photos: photo ? [photo] : undefined,
    ...extra,
  });

  const priceErrorRequest = (r?: VisionPriceResult) => onRequest({
    toDept: r?.matched?.dept,
    category: '가격 오류',
    title: r?.matched ? `${r.matched.name} 가격표 오류` : '가격표 오류 확인',
    detail: r?.message ?? '가격표 사진을 확인해 주세요.',
    location: r?.matched ? `${r.matched.corner} ${r.matched.shelf}` : undefined,
    photos: preview ? [preview] : undefined,
  });

  const lookup = (e: FormEvent) => {
    e.preventDefault();
    const digits = code.replace(/\D/g, '');
    if (digits.length < 8) return onError('바코드 아래 숫자 8~13자리를 입력해 주세요.');
    setManual(false);
    void analyze({ barcode: digits });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
        <button onClick={() => setUpload(true)} className={cx('flex-1 whitespace-nowrap rounded-lg py-2 text-sm font-semibold', upload ? 'bg-white shadow-sm' : 'text-slate-600')}>
          사진 올리기
        </button>
        {MODES.map(m => (
          <button key={m.mode} onClick={() => reset(m.mode)} className={cx('flex-1 whitespace-nowrap rounded-lg py-2 text-sm font-semibold', !upload && mode === m.mode ? 'bg-white shadow-sm' : 'text-slate-600')}>
            {m.label}
          </button>
        ))}
      </div>
      {upload ? (
        <>
          <p className="text-sm text-slate-500">가격표·바코드·상품 사진을 찍거나 앨범에서 골라 담당 부서에 바로 보냅니다.</p>
          <PhotoUpload me={me} onSent={onSent} onError={onError} />
        </>
      ) : mode === 'flyer' ? (
        <>
          <p className="text-sm text-slate-500">{info.hint}</p>
          <FlyerUpload aiEnabled={aiEnabled} products={products} onError={onError} onToast={onToast} />
        </>
      ) : <>
      <p className="text-sm text-slate-500">{info.hint}</p>
      {!aiEnabled && mode === 'price' && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">AI 키가 없어 가격 자동 대조는 꺼져 있습니다. 사진을 찍어 해당 부서에 가격 확인을 요청할 수 있습니다.</p>
      )}

      <button onClick={() => setCamera(true)} disabled={busy} className={cx(primaryBtn, 'flex items-center justify-center gap-2 py-5')}>
        {mode === 'barcode' ? <ScanLine className="size-5" /> : <Camera className="size-5" />}{busy ? '확인하는 중…' : info.button}
      </button>

      {mode === 'barcode' && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setManual(true); setResult(null); }} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-bold text-slate-700"><Keyboard className="size-4" />번호 직접 입력</button>
          <button onClick={() => damageReport(preview ?? undefined)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-bold text-red-600"><AlertTriangle className="size-4" />바코드 훼손 신고</button>
        </div>
      )}

      {manual && (
        <form onSubmit={lookup} className="space-y-2 rounded-2xl bg-white p-4">
          <label htmlFor="barcode-digits" className="text-sm font-bold text-slate-800">바코드 아래 숫자 입력</label>
          <div className="flex gap-2">
            <input id="barcode-digits" autoFocus className={inputCls} inputMode="numeric" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="8801043014809" />
            <button className="shrink-0 rounded-xl bg-blue-600 px-4 font-bold text-white">조회</button>
          </div>
          <p className="text-xs text-slate-500">숫자도 안 보일 만큼 훼손됐으면 위의 "바코드 훼손 신고"를 눌러 주세요.</p>
        </form>
      )}

      {preview && <img src={preview} alt="촬영한 사진" className="max-h-64 w-full rounded-2xl bg-slate-900 object-contain" />}

      {!aiEnabled && preview && mode === 'price' && !result && (
        <button onClick={() => priceErrorRequest()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white">
          <Send className="size-4" />이 사진으로 가격 확인 요청 보내기
        </button>
      )}

      {result?.mode === 'price' && (
        <div className={cx('rounded-2xl p-4', result.verdict === 'ok' ? 'bg-emerald-50' : result.verdict === 'mismatch' ? 'bg-red-50' : 'bg-slate-100')}>
          <div className="flex items-center gap-2 font-bold">
            {result.verdict === 'ok' ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" /> : result.verdict === 'mismatch' ? <AlertTriangle className="size-5 shrink-0 text-red-600" /> : <HelpCircle className="size-5 shrink-0 text-slate-500" />}
            {result.message}
          </div>
          {result.matched && <p className="mt-1 text-sm text-slate-600">인식 상품: {result.matched.name} ({result.matched.dept}){result.promotion ? ` · 행사 ${result.promotion.condition ?? ''}` : ''}</p>}
          {result.verdict !== 'ok' && (
            <button onClick={() => priceErrorRequest(result as VisionPriceResult)} className="mt-3 w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white">
              {result.matched ? `${result.matched.dept}에 가격 오류 요청 보내기 (사진 첨부)` : '사진 첨부해서 가격 확인 요청'}
            </button>
          )}
        </div>
      )}

      {result?.mode === 'barcode' && (
        (result as VisionBarcodeResult).matched
          ? <ProductCard p={(result as VisionBarcodeResult).matched!} onRequest={onRequest} photo={preview ?? undefined} />
          : (
            <div className="space-y-3 rounded-2xl bg-amber-50 p-4">
              <p className="font-bold text-amber-900">등록되지 않은 바코드{result.barcode ? ` (${result.barcode})` : ''}</p>
              <p className="text-sm text-amber-800">상품 DB에 없는 번호입니다. 바코드가 훼손됐거나 잘못 붙었을 수 있습니다.</p>
              <button onClick={() => damageReport(preview ?? undefined, { detail: `읽힌 번호: ${result.barcode ?? '판독 실패'} — 상품 DB에 없음. 바코드 확인 부탁드립니다.` })} className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white">
                바코드 오류 신고 (사진 첨부)
              </button>
            </div>
          )
      )}

      {camera && (
        <CameraView
          mode={mode}
          onClose={() => setCamera(false)}
          onCapture={onCapture}
          onBarcode={mode === 'barcode' ? onBarcode : undefined}
          onManual={mode === 'barcode' ? () => { setCamera(false); setManual(true); setResult(null); } : undefined}
          onDamage={mode === 'barcode' ? photo => { setCamera(false); damageReport(photo); } : undefined}
        />
      )}
      </>}
    </div>
  );
}
