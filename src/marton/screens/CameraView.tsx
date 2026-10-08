import { useEffect, useRef, useState } from 'react';
import { X, Zap, ZapOff, Image as ImageIcon, Keyboard, AlertTriangle, ScanLine } from 'lucide-react';
import { CAMERA_PROBLEM_TEXT, fileToJpeg, openRearCamera, readBarcode, toJpeg, torchControl, warmUpBarcodeReader, type CameraProblem } from '../camera';
import { cx } from '../ui';

export type CameraMode = 'barcode' | 'price' | 'flyer' | 'photo';

const GUIDE: Record<CameraMode, { title: string; hint: string; frame?: string }> = {
  barcode: { title: '바코드 스캔', hint: '바코드를 가로로 틀 안에 맞춰 주세요. 자동으로 읽습니다.', frame: 'w-[82%] h-[20%]' },
  price: { title: '가격표 촬영', hint: '가격표(쇼카드)가 틀 안에 꽉 차게 찍어 주세요.', frame: 'w-[86%] h-[30%]' },
  flyer: { title: '행사 전단 촬영', hint: '전단 한 면이 모두 보이게 찍어 주세요.', frame: 'w-[88%] h-[62%]' },
  photo: { title: '사진 첨부', hint: '상품·가격표·바코드가 잘 보이게 찍어 주세요. 사람 얼굴은 찍지 않습니다.' },
};

const HELP_AFTER_MS = 6000; // 이 시간 동안 바코드를 못 읽으면 대처 방법 안내

/**
 * 앱 안 카메라 창.
 * barcode 모드는 화면을 계속 판독하고, 못 읽으면 직접 입력·사진 판독·훼손 신고를 안내한다.
 */
export default function CameraView({ mode, onCapture, onBarcode, onManual, onDamage, onClose }: {
  mode: CameraMode;
  onCapture: (photo: string) => void;
  onBarcode?: (code: string, photo: string) => void;
  onManual?: () => void;
  onDamage?: (photo: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [problem, setProblem] = useState<CameraProblem | null>(null);
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState<{ supported: boolean; set: (on: boolean) => Promise<void> } | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [flash, setFlash] = useState(false);
  const albumRef = useRef<HTMLInputElement>(null);
  const nativeCamRef = useRef<HTMLInputElement>(null);
  const guide = GUIDE[mode];

  // 카메라 열기 / 닫기
  useEffect(() => {
    let cancelled = false;
    if (mode === 'barcode') warmUpBarcodeReader();
    void openRearCamera().then(result => {
      if (cancelled) {
        if (typeof result !== 'string') result.getTracks().forEach(t => t.stop());
        return;
      }
      if (typeof result === 'string') return setProblem(result);
      streamRef.current = result;
      setTorch(torchControl(result));
      const video = videoRef.current!;
      video.srcObject = result;
      video.play().then(() => setReady(true), () => setReady(true));
    });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [mode]);

  const grab = (maxSide = 1280) => {
    const v = videoRef.current!;
    return toJpeg(v, v.videoWidth, v.videoHeight, maxSide);
  };

  // 바코드 자동 판독
  useEffect(() => {
    if (mode !== 'barcode' || !ready || !onBarcode) return;
    let stop = false;
    const started = Date.now();
    const canvas = document.createElement('canvas');
    const loop = async () => {
      if (stop) return;
      const v = videoRef.current;
      if (v && v.videoWidth) {
        const scale = Math.min(1, 960 / v.videoWidth);
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        canvas.getContext('2d')!.drawImage(v, 0, 0, canvas.width, canvas.height);
        const code = await readBarcode(canvas);
        if (stop) return;
        if (code) {
          navigator.vibrate?.(80);
          onBarcode(code, grab());
          return;
        }
        if (Date.now() - started > HELP_AFTER_MS) setShowHelp(true);
      }
      setTimeout(loop, 300);
    };
    void loop();
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ready]);

  const shutter = () => {
    if (!ready) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    onCapture(grab());
  };

  const fromFile = async (file?: File) => {
    if (!file) return;
    const photo = await fileToJpeg(file);
    if (mode === 'barcode' && onBarcode) {
      const code = await readBarcode(await createImageBitmap(file));
      if (code) return onBarcode(code, photo);
      setShowHelp(true);
      return onCapture(photo);
    }
    onCapture(photo);
  };

  const toggleTorch = async () => {
    if (!torch) return;
    await torch.set(!torchOn);
    setTorchOn(t => !t);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={guide.title}>
      <div className="flex items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button onClick={onClose} aria-label="카메라 닫기" className="rounded-full bg-white/15 p-2"><X className="size-5" /></button>
        <span className="flex-1 text-[15px] font-bold">{guide.title}</span>
        {torch?.supported && (
          <button onClick={toggleTorch} aria-label={torchOn ? '손전등 끄기' : '손전등 켜기'} className={cx('rounded-full p-2', torchOn ? 'bg-yellow-300 text-black' : 'bg-white/15')}>
            {torchOn ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
          </button>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 size-full object-cover" />
        {flash && <div className="absolute inset-0 bg-white/70" />}

        {!problem && guide.frame && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className={cx('relative rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]', guide.frame)}>
              {(['left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl',
                'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl'] as const).map(c => (
                <span key={c} className={cx('absolute size-7 border-yellow-300', c)} />
              ))}
              {mode === 'barcode' && <span className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.7)]" />}
            </div>
          </div>
        )}

        {!ready && !problem && <p className="absolute inset-x-0 top-1/2 text-center text-sm text-white/70">카메라를 여는 중…</p>}

        {problem && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <AlertTriangle className="size-10 text-yellow-300" />
            <p className="max-w-xs text-[15px] leading-relaxed">{CAMERA_PROBLEM_TEXT[problem]}</p>
            <button onClick={() => nativeCamRef.current?.click()} className="w-full max-w-xs rounded-xl bg-white py-3.5 font-bold text-black">휴대폰 카메라로 촬영</button>
          </div>
        )}

        {mode === 'barcode' && showHelp && (
          <div className="absolute inset-x-3 bottom-3 space-y-2 rounded-2xl bg-white p-4 text-slate-900 shadow-xl">
            <p className="flex items-center gap-1.5 text-sm font-bold"><ScanLine className="size-4 text-red-600" />바코드가 안 읽히나요?</p>
            <p className="text-xs text-slate-500">손전등을 켜거나 15~20cm 거리에서 다시 맞춰 보세요. 그래도 안 되면:</p>
            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              {onManual && <button onClick={onManual} className="flex flex-col items-center gap-1 rounded-xl bg-slate-100 py-2.5"><Keyboard className="size-4" />번호 입력</button>}
              <button onClick={shutter} className="flex flex-col items-center gap-1 rounded-xl bg-slate-100 py-2.5"><ImageIcon className="size-4" />사진으로 판독</button>
              {onDamage && <button onClick={() => ready && onDamage(grab())} className="flex flex-col items-center gap-1 rounded-xl bg-red-50 py-2.5 text-red-700"><AlertTriangle className="size-4" />훼손 신고</button>}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
        <p className="text-center text-[13px] text-white/80">{guide.hint}</p>
        <div className="flex items-center justify-between">
          <button onClick={() => albumRef.current?.click()} className="flex w-16 flex-col items-center gap-1 text-[11px] text-white/80">
            <ImageIcon className="size-6" />앨범
          </button>
          <button onClick={problem ? () => nativeCamRef.current?.click() : shutter} aria-label="촬영" className="grid size-[72px] place-items-center rounded-full border-4 border-white/40">
            <span className="size-14 rounded-full bg-white active:bg-white/70" />
          </button>
          <span className="w-16" />
        </div>
      </div>

      <input ref={albumRef} type="file" accept="image/*" className="hidden" onChange={e => { void fromFile(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={nativeCamRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { void fromFile(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
