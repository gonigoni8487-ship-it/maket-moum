// 카메라·사진·바코드 공용 도구
// - 안드로이드 Chrome: 내장 BarcodeDetector 사용
// - 아이폰 Safari 등 내장 기능이 없는 기기: zxing(wasm) 판독기를 필요할 때만 불러온다 (자체 서버에서 제공, 외부 CDN 미사용)

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];

type Detector = { detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]> };
let detectorPromise: Promise<Detector> | null = null;

function getDetector(): Promise<Detector> {
  detectorPromise ??= (async () => {
    const Native = (window as any).BarcodeDetector;
    if (Native) {
      try {
        const supported: string[] = await Native.getSupportedFormats();
        const formats = FORMATS.filter(f => supported.includes(f));
        if (formats.includes('ean_13')) return new Native({ formats });
      } catch { /* 내장 기능이 있어도 쓸 수 없으면 아래로 */ }
    }
    const [{ BarcodeDetector, setZXingModuleOverrides }, { default: wasmUrl }] = await Promise.all([
      import('barcode-detector/ponyfill'),
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ]);
    setZXingModuleOverrides({ locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) });
    return new BarcodeDetector({ formats: FORMATS as any }) as Detector;
  })();
  return detectorPromise;
}

/** 이미지에서 바코드 번호를 읽는다. 못 읽으면 null */
export async function readBarcode(source: ImageBitmapSource): Promise<string | null> {
  try {
    const codes = await (await getDetector()).detect(source);
    return codes[0]?.rawValue?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * 흐릿하거나 작은 바코드용 보정: 흑백 → 명암 늘리기(위아래 2% 버림) → 선명하게(언샤프 마스크).
 * 휴대폰에서 거리가 있거나 초점이 살짝 나간 바코드가 이 보정으로 읽히는 경우가 많다.
 */
export function sharpenForBarcode(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;
  const lum = new Float32Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const l = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000;
    lum[i] = l;
    hist[l | 0]++;
  }
  let lo = 0, hi = 255, acc = 0;
  while (lo < 255 && (acc += hist[lo]) < n * 0.02) lo++;
  acc = 0;
  while (hi > 0 && (acc += hist[hi]) < n * 0.02) hi--;
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < n; i++) lum[i] = Math.min(255, Math.max(0, ((lum[i] - lo) * 255) / span));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      // 3×3 평균으로 흐린 값과의 차이를 키운다
      let sum = 0, cnt = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += lum[yy * w + xx];
          cnt++;
        }
      }
      const v = Math.min(255, Math.max(0, lum[i] + 2 * (lum[i] - sum / cnt)));
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** 카메라 판독기를 미리 불러 둔다 (첫 스캔 지연 줄이기) */
export const warmUpBarcodeReader = () => { void getDetector(); };

/** 영상·이미지를 긴 변 maxSide 픽셀 JPEG data URL로 줄인다 */
export function toJpeg(source: CanvasImageSource, width: number, height: number, maxSide = 1280, quality = 0.82): string {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function fileToJpeg(file: File, maxSide = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file);
  return toJpeg(bitmap, bitmap.width, bitmap.height, maxSide);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'image/jpeg';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export type CameraProblem = 'insecure' | 'unsupported' | 'denied' | 'no-camera' | 'busy';

export const CAMERA_PROBLEM_TEXT: Record<CameraProblem, string> = {
  insecure: '카메라는 https 주소에서만 열립니다. 아래 버튼으로 휴대폰 카메라 앱을 써 주세요.',
  unsupported: '이 브라우저는 앱 안 카메라를 지원하지 않습니다. 아래 버튼으로 촬영해 주세요.',
  denied: '카메라 권한이 꺼져 있습니다. 브라우저 설정에서 카메라를 허용하거나 아래 버튼으로 촬영해 주세요.',
  'no-camera': '사용할 수 있는 카메라가 없습니다.',
  busy: '다른 앱이 카메라를 쓰고 있습니다. 잠시 후 다시 열어 주세요.',
};

/** 후면 카메라를 연다. 실패하면 이유를 돌려준다 */
export async function openRearCamera(): Promise<MediaStream | CameraProblem> {
  if (!window.isSecureContext) return 'insecure';
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
    // 가까이 댄 바코드·가격표에 초점이 계속 맞도록 (지원하는 기기만)
    const track = stream.getVideoTracks()[0];
    const caps = (track?.getCapabilities?.() ?? {}) as { focusMode?: string[] };
    if (caps.focusMode?.includes('continuous')) await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {});
    return stream;
  } catch (e) {
    const name = (e as DOMException).name;
    if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-camera';
    return 'busy';
  }
}

/** 손전등(플래시) 지원 여부와 켜고 끄기 */
export function torchControl(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  const caps = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
  return {
    supported: Boolean(caps.torch),
    set: (on: boolean) => track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] }).catch(() => {}),
  };
}

/** 확대(줌) 지원 여부와 1배 ↔ 2배 전환 (멀리 있는 작은 바코드용) */
export function zoomControl(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  const caps = (track?.getCapabilities?.() ?? {}) as { zoom?: { min: number; max: number } };
  const z = caps.zoom;
  const zoomed = z ? Math.min(2, z.max) : 1;
  return {
    supported: Boolean(z && z.max >= 1.5),
    set: (on: boolean) => track.applyConstraints({ advanced: [{ zoom: on ? zoomed : Math.max(1, z?.min ?? 1) } as MediaTrackConstraintSet] }).catch(() => {}),
  };
}
