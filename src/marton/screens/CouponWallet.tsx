import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Coffee, Download, X } from 'lucide-react';
import type { Coupon } from '../shared';
import { api } from '../api';
import { couponImage } from '../coupon-image';
import { cx, Empty } from '../ui';

const usable = (c: Coupon) => !c.usedAt && c.expiresAt >= Date.now();

/** 쿠폰 이미지는 한 번만 그린다 (사용하면 다시) */
function useCouponImage(c: Coupon) {
  return useMemo(() => couponImage(c), [c.id, c.usedAt]); // eslint-disable-line react-hooks/exhaustive-deps
}

function CouponThumb({ c, onOpen }: { c: Coupon; onOpen: () => void }) {
  const src = useCouponImage(c);
  return (
    <button type="button" onClick={onOpen} className={cx('block w-full overflow-hidden rounded-2xl shadow-sm', !usable(c) && 'opacity-60')}>
      <img src={src} alt={`소통 커피쿠폰 ${c.no}/${c.total}`} className="w-full" />
    </button>
  );
}

/** 커피 매장에 보여 주는 화면: 실시간 시계로 캡처 화면이 아님을 확인, 사용 완료는 두 번 눌러서 */
function CouponShow({ c, onClose, onUsed, onError }: { c: Coupon; onClose: () => void; onUsed: (c: Coupon) => void; onError: (m: string) => void }) {
  const src = useCouponImage(c);
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const use = async () => {
    setBusy(true);
    try {
      onUsed(await api<Coupon>(`/coupons/${c.id}/use`, {}));
      setConfirm(false);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = `소통커피쿠폰-${c.serial}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#2b1a11] text-white" role="dialog" aria-modal="true" aria-label="소통 커피쿠폰">
      <div className="flex items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button onClick={onClose} aria-label="닫기" className="rounded-full bg-white/15 p-2"><X className="size-5" /></button>
        <span className="flex-1 text-[15px] font-bold">커피 매장에 이 화면을 보여 주세요</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4">
        <img src={src} alt={`소통 커피쿠폰 ${c.no}/${c.total}`} className="w-full max-w-xl rounded-2xl shadow-2xl" />
        <div className="text-center">
          <p className="font-mono text-4xl font-bold tabular-nums motion-safe:animate-pulse">{new Date(now).toLocaleTimeString('ko-KR', { hour12: false })}</p>
          <p className="mt-1 text-xs text-white/60">시계가 움직이면 실제 앱 화면입니다 (캡처 사진 사용 불가)</p>
        </div>
      </div>
      <div className="space-y-2 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        {usable(c) && (confirm
          ? (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfirm(false)} className="rounded-xl bg-white/15 py-4 font-bold">취소</button>
              <button onClick={use} disabled={busy} className="rounded-xl bg-orange-500 py-4 font-black text-white disabled:opacity-50">{busy ? '처리 중…' : '네, 사용 완료'}</button>
            </div>
          )
          : <button onClick={() => setConfirm(true)} className="w-full rounded-xl bg-orange-500 py-4 text-[17px] font-black">커피 받았어요 · 사용 완료 처리</button>)}
        <button onClick={save} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-bold"><Download className="size-4" />이미지로 저장</button>
      </div>
    </div>
  );
}

/** 내 소통 커피쿠폰 보관함 */
export default function CouponWallet({ coupons, onClose, onUsed, onError }: {
  coupons: Coupon[]; onClose: () => void; onUsed: (c: Coupon) => void; onError: (m: string) => void;
}) {
  const [open, setOpen] = useState<Coupon | null>(null);
  const ready = coupons.filter(usable).sort((a, b) => a.createdAt - b.createdAt || a.no - b.no);
  const past = coupons.filter(c => !usable(c)).sort((a, b) => (b.usedAt ?? b.expiresAt) - (a.usedAt ?? a.expiresAt));
  // 같은 묶음은 1번부터: 각 묶음에서 가장 앞 번호만 "지금 쓰기"
  const next = new Set<string>();
  const seen = new Set<string>();
  for (const c of ready) if (!seen.has(c.batchId)) { seen.add(c.batchId); next.add(c.id); }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#f3e9dc]" role="dialog" aria-modal="true" aria-label="소통 커피쿠폰 보관함">
      <div className="flex items-center gap-3 bg-[#4a2c1d] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white">
        <button onClick={onClose} aria-label="뒤로" className="rounded-full bg-white/15 p-2"><ArrowLeft className="size-5" /></button>
        <Coffee className="size-5" />
        <span className="flex-1 text-[16px] font-black">소통 커피쿠폰 보관함</span>
        <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">{ready.length}장</span>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {!coupons.length && <Empty>아직 받은 커피쿠폰이 없습니다. 점장·부점장님이 보내면 알림음과 함께 여기에 들어옵니다.</Empty>}
        {ready.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-[#4a2c1d]">사용할 수 있는 쿠폰 · 1번부터 순서대로</h2>
            {ready.map(c => (
              <div key={c.id} className="space-y-1.5">
                <CouponThumb c={c} onOpen={() => setOpen(c)} />
                {next.has(c.id) && <button onClick={() => setOpen(c)} className="w-full rounded-xl bg-[#4a2c1d] py-3 text-sm font-bold text-white">{c.no}번 쿠폰 지금 쓰기</button>}
              </div>
            ))}
          </section>
        )}
        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-[#7a6a5e]">사용·기간 지난 쿠폰</h2>
            {past.slice(0, 20).map(c => <CouponThumb key={c.id} c={c} onOpen={() => setOpen(c)} />)}
          </section>
        )}
      </div>
      {open && (
        <CouponShow
          c={coupons.find(x => x.id === open.id) ?? open}
          onClose={() => setOpen(null)}
          onUsed={c => { onUsed(c); }}
          onError={onError}
        />
      )}
    </div>
  );
}
