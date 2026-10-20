import { useRef, useState } from 'react';
import { Camera, CheckCircle2, FileText, Image as ImageIcon, FolderOpen, Loader2, MapPin, Megaphone, Paperclip, Plus, RotateCw, Trash2, X, AlertTriangle } from 'lucide-react';
import { bayText, matchProduct, type FlyerItem, type Product, type Promotion, type VisionFlyerResult } from '../shared';
import { api } from '../api';
import { FLYER_FILE_ACCEPT, flyerFileToDataUrl, isPdf } from '../camera';
import { cx, won } from '../ui';
import CameraView, { FLYER_MAX_SIDE } from './CameraView';
import BroadcastMaker from './BroadcastMaker';
import BroadcastNote, { useBroadcastNote } from './BroadcastNote';

const MAX_PAGES = 4;

type Page = { id: number; src: string; pdf?: string; state: 'waiting' | 'reading' | 'done' | 'failed'; count?: number; error?: string };
type Row = FlyerItem & { key: number; page?: number; include: boolean };

const field = 'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none';
const numOrUndef = (v: string) => { const n = Number(v.replace(/\D/g, '')); return n > 0 ? n : undefined; };
const sameItem = (a: FlyerItem, b: FlyerItem) =>
  (a.code && b.code && a.code === b.code) || (a.name.replace(/\s+/g, '') === b.name.replace(/\s+/g, '') && (a.spec ?? '') === (b.spec ?? ''));

/** 행사 전단 올리기: 사진(여러 장) → 자동 인식 → 직원이 확인·수정 → 행사상품 등록 */
export default function FlyerUpload({ aiEnabled, products, promotions, onError, onToast }: {
  aiEnabled: boolean; products: Product[]; promotions: Promotion[]; onError: (m: string) => void; onToast: (m: string) => void;
}) {
  const [pages, setPages] = useState<Page[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [camera, setCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const [broadcast, setBroadcast] = useState<FlyerItem[] | null>(null);
  const albumRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // 추가 지시사항 ("수산물 행사만" 등): 인식에 쓰고, 방송 만들기에도 그대로 넘어간다
  const [note, saveNote] = useBroadcastNote();
  const [readWith, setReadWith] = useState<string | null>(null);
  const seq = useRef(0);
  const room = MAX_PAGES - pages.length;
  const reading = pages.some(p => p.state === 'reading' || p.state === 'waiting');
  const chosen = rows.filter(r => r.include && r.name.trim());
  const recent = [...promotions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);
  const asItems = (list: FlyerItem[]): FlyerItem[] => list.map(({ name, code, spec, price, originalPrice, condition, period }) => ({ name, code, spec, price, originalPrice, condition, period }));

  const updatePage = (id: number, patch: Partial<Page>) => setPages(ps => ps.map(p => (p.id === id ? { ...p, ...patch } : p)));

  const recognize = async (page: Page) => {
    updatePage(page.id, { state: 'reading', error: undefined });
    try {
      const r = await api<VisionFlyerResult>('/ai/vision', { mode: 'flyer', image: page.src, note: note.trim() || undefined });
      setReadWith(note.trim());
      setRows(prev => {
        const next = prev.filter(x => x.page !== page.id); // 다시 인식하면 그 장의 결과를 바꾼다
        for (const it of r.items) {
          if (next.some(x => sameItem(x, it))) continue;
          next.push({ ...it, key: ++seq.current, page: page.id, include: true });
        }
        return next;
      });
      updatePage(page.id, { state: 'done', count: r.items.length });
    } catch (e) {
      updatePage(page.id, { state: 'failed', error: (e as Error).message });
    }
  };

  const addPages = (srcs: (string | { src: string; pdf?: string })[]) => {
    const added = srcs.slice(0, room).map(x => ({ id: ++seq.current, ...(typeof x === 'string' ? { src: x } : x), state: aiEnabled ? 'waiting' : 'done' } as Page));
    setPages(ps => [...ps, ...added]);
    // 한 장씩 차례로 인식 (동시에 보내면 느린 매장 Wi-Fi에서 모두 실패하기 쉽다)
    if (aiEnabled) void added.reduce((chain, p) => chain.then(() => recognize(p)), Promise.resolve());
  };

  // 앨범·파일 첨부: 사진과 PDF 전단 (PDF는 여러 쪽을 한 번에 읽는다)
  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].filter(f => f.type.startsWith('image/') || isPdf(f));
    if (list.length < files.length) onError('사진(jpg·png 등)이나 PDF 파일만 올릴 수 있습니다.');
    if (list.length > room) onError(`전단은 한 번에 ${MAX_PAGES}개까지입니다. ${room}개만 넣었습니다.`);
    const ok: { src: string; pdf?: string }[] = [];
    for (const f of list.slice(0, room)) {
      try {
        ok.push({ src: await flyerFileToDataUrl(f, FLYER_MAX_SIDE), pdf: isPdf(f) ? f.name : undefined });
      } catch (e) {
        onError(isPdf(f) ? (e as Error).message : `${f.name} 사진을 읽지 못했습니다. 다른 파일을 골라 주세요.`);
      }
    }
    if (ok.length) addPages(ok);
  };

  const removePage = (id: number) => {
    setPages(ps => ps.filter(p => p.id !== id));
    setRows(rs => rs.filter(r => r.page !== id));
  };

  const edit = (key: number, patch: Partial<Row>) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const addBlank = () => setRows(rs => [...rs, { key: ++seq.current, name: '', include: true, period: rs.at(-1)?.period }]);

  const register = async () => {
    if (!chosen.length) return onError('등록할 상품을 한 개 이상 선택해 주세요.');
    setSaving(true);
    try {
      const items = asItems(chosen);
      const added = await api<Promotion[]>('/promotions', { items });
      onToast(`행사상품 ${added.length}개를 등록했습니다. 상품찾기·가격표 확인에 바로 반영됩니다.`);
      setPages([]); setRows([]);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {!aiEnabled && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
          AI 키(GEMINI_API_KEY)가 설정되지 않아 자동 인식이 꺼져 있습니다. 전단 사진을 올려 보면서 아래에 직접 입력해 등록할 수 있습니다.
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-700">1. 전단 사진·파일 <span className="font-normal text-slate-400">(앞·뒷면, PDF 등 최대 {MAX_PAGES}개)</span></span>
          <span className="text-xs font-semibold text-slate-500">{pages.length} / {MAX_PAGES}</span>
        </div>
        {pages.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {pages.map((p, i) => (
              <div key={p.id} className="relative overflow-hidden rounded-xl bg-slate-900">
                {p.pdf
                  ? <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 bg-slate-100 p-3 text-center text-slate-600"><FileText className="size-10 text-red-500" /><span className="line-clamp-3 break-all text-xs font-semibold">{p.pdf}</span></div>
                  : <img src={p.src} alt={`전단 ${i + 1}쪽`} className="aspect-[3/4] w-full object-contain" />}
                <button type="button" onClick={() => removePage(p.id)} aria-label={`전단 ${i + 1}쪽 빼기`} className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"><X className="size-4" /></button>
                <div className={cx('absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-white',
                  p.state === 'reading' ? 'bg-blue-600/90' : p.state === 'waiting' ? 'bg-slate-700/90' : p.state === 'failed' ? 'bg-red-600/90' : 'bg-emerald-600/90')}>
                  {p.state === 'waiting' && <>순서 기다리는 중</>}
                  {p.state === 'reading' && <><Loader2 className="size-3.5 animate-spin" />인식하는 중…</>}
                  {p.state === 'done' && <><CheckCircle2 className="size-3.5" />{aiEnabled ? `${p.count ?? 0}개 인식` : `${i + 1}쪽`}</>}
                  {p.state === 'failed' && (
                    <button type="button" onClick={() => void recognize(p)} className="flex items-center gap-1.5"><RotateCw className="size-3.5" />인식 실패 · 다시</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {room > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setCamera(true)} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-pink-600 py-5 text-[15px] font-bold text-white active:bg-pink-700">
              <Camera className="size-6" />전단 촬영
            </button>
            <button type="button" onClick={() => albumRef.current?.click()} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-pink-200 bg-white py-5 text-[15px] font-bold text-pink-700 active:bg-pink-50">
              <ImageIcon className="size-6" />앨범에서 고르기
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="col-span-2 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-pink-300 bg-white py-3.5 text-[15px] font-bold text-pink-700 active:bg-pink-50">
              <Paperclip className="size-5" />파일 첨부 (사진·PDF 전단)
            </button>
          </div>
        )}
        <input ref={albumRef} type="file" accept="image/*" multiple hidden onChange={e => { void pickFiles(e.target.files); e.target.value = ''; }} />
        <input ref={fileRef} type="file" accept={FLYER_FILE_ACCEPT} multiple hidden onChange={e => { void pickFiles(e.target.files); e.target.value = ''; }} />
        <p className="text-xs text-slate-500">전단 한 면이 화면에 꽉 차게, 글씨가 흔들리지 않게 찍어 주세요. 판매코드처럼 작은 글씨는 가까이서 나눠 찍으면 더 잘 읽힙니다.</p>
        {aiEnabled && <BroadcastNote note={note} onChange={saveNote} />}
        {aiEnabled && pages.length > 0 && !reading && readWith !== null && readWith !== note.trim() && (
          <button type="button" onClick={() => void pages.reduce((chain, p) => chain.then(() => recognize(p)), Promise.resolve())}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-pink-600 py-3 text-sm font-bold text-white active:bg-pink-700">
            <RotateCw className="size-4" />바뀐 지시사항대로 전단 다시 인식
          </button>
        )}
      </div>

      {aiEnabled && rows.length === 0 && pages.length === 0 && recent.length > 0 && (
        <button type="button" onClick={() => setBroadcast(asItems(recent))} className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left active:bg-pink-50">
          <Megaphone className="size-6 shrink-0 text-pink-600" />
          <span><span className="block text-[15px] font-bold text-slate-900">등록된 행사로 매장 방송 만들기</span><span className="text-xs text-slate-500">최근 행사상품 {recent.length}개 · 쇼호스트 음성 + 분위기 배경음악 (1~3분)</span></span>
        </button>
      )}
      {aiEnabled && rows.length === 0 && pages.length === 0 && (
        <button type="button" onClick={() => setBroadcast([])} className="flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-pink-700 underline underline-offset-4">
          <FolderOpen className="size-4" />만든 방송 보관함 (다시 듣기·MP3 다운로드)
        </button>
      )}

      {rows.length === 0 && pages.length === 0 && (
        <button type="button" onClick={addBlank} className="w-full text-center text-sm font-semibold text-slate-500 underline underline-offset-4">사진 없이 직접 입력하기</button>
      )}

      {(rows.length > 0 || pages.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-slate-700">2. 인식 결과 확인 <span className="font-normal text-slate-400">(틀린 곳은 눌러서 고치기)</span></span>
            <span className="text-xs font-semibold text-slate-500">{chosen.length} / {rows.length}개 선택</span>
          </div>
          {reading && rows.length === 0 && <p className="rounded-xl bg-blue-50 px-3.5 py-3 text-sm text-blue-800">전단을 읽고 있습니다. 한 장에 10~20초쯤 걸립니다.</p>}
          {!reading && aiEnabled && pages.length > 0 && rows.length === 0 && (
            <p className="rounded-xl bg-slate-100 px-3.5 py-3 text-sm text-slate-600">행사상품을 찾지 못했습니다. 더 가까이, 밝은 곳에서 다시 찍거나 아래에서 직접 추가해 주세요.</p>
          )}

          {rows.map(r => {
            const product = r.name.trim() ? matchProduct(r, products) : undefined;
            const off = r.originalPrice && r.price && r.originalPrice > r.price ? Math.round((1 - r.price / r.originalPrice) * 100) : 0;
            return (
              <div key={r.key} className={cx('space-y-2 rounded-2xl border bg-white p-3', r.include ? 'border-pink-200' : 'border-slate-200 opacity-60')}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={r.include} onChange={e => edit(r.key, { include: e.target.checked })} aria-label="등록할 상품으로 선택" className="size-5 shrink-0 accent-pink-600" />
                  <input className={cx(field, 'font-bold')} value={r.name} onChange={e => edit(r.key, { name: e.target.value })} placeholder="상품명" aria-label="상품명" maxLength={60} />
                  <button type="button" onClick={() => setRows(rs => rs.filter(x => x.key !== r.key))} aria-label="이 줄 지우기" className="shrink-0 rounded-lg p-2 text-slate-400 active:bg-slate-100"><Trash2 className="size-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-0.5 text-[11px] font-semibold text-slate-500">판매코드
                    <input className={cx(field, 'font-mono')} inputMode="numeric" value={r.code ?? ''} onChange={e => edit(r.key, { code: e.target.value.replace(/[^0-9A-Za-z-]/g, '').slice(0, 20) || undefined })} placeholder="전단에 없으면 비워 두기" />
                  </label>
                  <label className="space-y-0.5 text-[11px] font-semibold text-slate-500">행사기간
                    <input className={field} value={r.period ?? ''} onChange={e => edit(r.key, { period: e.target.value || undefined })} placeholder="10/9~10/15" maxLength={40} />
                  </label>
                  <label className="col-span-2 space-y-0.5 text-[11px] font-semibold text-slate-500">규격·단위
                    <input className={field} value={r.spec ?? ''} onChange={e => edit(r.key, { spec: e.target.value || undefined })} placeholder="각 500g/냉장/국산, 120g×5입" maxLength={40} />
                  </label>
                  <label className="space-y-0.5 text-[11px] font-semibold text-slate-500">정상가
                    <input className={field} inputMode="numeric" value={r.originalPrice ? r.originalPrice.toLocaleString() : ''} onChange={e => edit(r.key, { originalPrice: numOrUndef(e.target.value) })} placeholder="원" />
                  </label>
                  <label className="space-y-0.5 text-[11px] font-semibold text-pink-600">행사가
                    <input className={cx(field, 'font-bold text-pink-700')} inputMode="numeric" value={r.price ? r.price.toLocaleString() : ''} onChange={e => edit(r.key, { price: numOrUndef(e.target.value) })} placeholder="원" />
                  </label>
                  <label className="col-span-2 space-y-0.5 text-[11px] font-semibold text-slate-500">행사 프로모션
                    <textarea rows={2} className={cx(field, 'resize-none')} value={r.condition ?? ''} onChange={e => edit(r.key, { condition: e.target.value || undefined })} placeholder="행사카드 50% 할인 + 대한민국 수산대전 20% 할인" maxLength={200} />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {off > 0 && <span className="rounded bg-pink-100 px-1.5 py-0.5 font-bold text-pink-700">{off}% ↓ {won(r.originalPrice! - r.price!)} 할인</span>}
                  {product
                    ? <span className="inline-flex items-center gap-1 font-semibold text-blue-700"><MapPin className="size-3.5" />매장 상품: {product.name} · {product.floor} {product.corner} {bayText(product)}</span>
                    : r.name.trim() && <span className="inline-flex items-center gap-1 text-slate-400"><AlertTriangle className="size-3.5" />매장 상품 목록에 없음 (행사 목록에만 등록)</span>}
                </div>
              </div>
            );
          })}

          <button type="button" onClick={addBlank} className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-white py-3 text-sm font-bold text-slate-600">
            <Plus className="size-4" />직접 추가
          </button>

          {aiEnabled && (
            <button type="button" onClick={() => setBroadcast(asItems(chosen))} disabled={reading || !chosen.length} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-pink-200 bg-white py-3.5 text-[15px] font-bold text-pink-700 active:bg-pink-50 disabled:opacity-50">
              <Megaphone className="size-5" />선택한 {chosen.length}개로 매장 방송 만들기 (음성 + 음악)
            </button>
          )}

          <button type="button" onClick={() => void register()} disabled={saving || reading || !chosen.length} className="w-full rounded-xl bg-pink-600 py-3.5 text-[15px] font-bold text-white active:bg-pink-700 disabled:opacity-50">
            {saving ? '등록하는 중…' : reading ? '인식이 끝나면 등록할 수 있습니다' : `선택한 ${chosen.length}개 행사상품 등록 (전 직원 공유)`}
          </button>
        </div>
      )}

      {broadcast && <BroadcastMaker items={broadcast} aiEnabled={aiEnabled} startInLibrary={!broadcast.length} onClose={() => setBroadcast(null)} onError={onError} />}
      {camera && <CameraView mode="flyer" onClose={() => setCamera(false)} onCapture={photo => { setCamera(false); addPages([photo]); }} />}
    </div>
  );
}
