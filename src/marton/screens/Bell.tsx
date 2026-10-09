import { useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { BELL_PLACES, type CustomerBell } from '../shared';
import { api } from '../api';
import { unlockAudio } from '../alerts';
import { cx, inputCls } from '../ui';

/** 호출벨 설정: 울려 보기, 이 기기를 게이트 호출벨 화면으로 쓰기 */
export function BellSheet({ onClose, onKiosk, onError, onToast }: { onClose: () => void; onKiosk: (place: string) => void; onError: (m: string) => void; onToast: (m: string) => void }) {
  const [place, setPlace] = useState<string>(BELL_PLACES[0]);
  const ring = async () => {
    unlockAudio();
    try { await api('/bells', { place }); onToast(`${place} 호출벨을 울렸습니다. 누군가 응대할 때까지 전 직원에게 반복됩니다.`); onClose(); }
    catch (e) { onError((e as Error).message); }
  };
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-2xl space-y-4 rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()} role="dialog" aria-label="고객 호출벨">
        <div className="flex items-center gap-2">
          <BellRing className="size-6 text-sky-600" />
          <h2 className="text-lg font-black text-slate-900">고객 호출벨</h2>
          <button onClick={onClose} aria-label="닫기" className="ml-auto rounded-full p-1.5 text-slate-500"><X className="size-5" /></button>
        </div>
        <p className="text-sm text-slate-600">호출벨이 울리면 전 직원 휴대폰에서 <b>"{place} 고객님 호출벨이 울렸습니다"</b>가 반복되고, 아무 부서나 한 명이 <b>응대하겠습니다</b>를 누르면 모두 꺼집니다.</p>
        <div className="flex flex-wrap gap-2">
          {BELL_PLACES.map(p => (
            <button key={p} onClick={() => setPlace(p)} aria-pressed={place === p} className={cx('rounded-full border px-3.5 py-2 text-sm font-semibold', place === p ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-200 text-slate-700')}>{p}</button>
          ))}
        </div>
        <input className={inputCls} value={place} onChange={e => setPlace(e.target.value)} maxLength={30} placeholder="위치 직접 입력" />
        <button onClick={() => place.trim() && onKiosk(place.trim())} className="w-full rounded-2xl bg-sky-600 py-4 text-[16px] font-black text-white">📱 이 기기를 「{place}」 호출벨 화면으로</button>
        <p className="-mt-2 text-xs text-slate-500">게이트에 둔 태블릿·공용 휴대폰에서 켜 두면 고객님이 화면을 눌러 직원을 부를 수 있습니다.</p>
        <button onClick={ring} className="w-full rounded-2xl bg-slate-100 py-3.5 font-bold text-slate-700">🔔 지금 한 번 울려 보기 (테스트)</button>
      </div>
    </div>
  );
}

/** 게이트용 호출벨 화면: 고객님이 누르면 직원 호출, 응대하면 "직원이 가고 있습니다" */
export function BellKiosk({ place, bells, onExit, onError }: { place: string; bells: CustomerBell[]; onExit: () => void; onError: (m: string) => void }) {
  const [sent, setSent] = useState<string | null>(null);
  const mine = bells.find(b => b.id === sent);
  const press = async () => {
    try { const b = await api<CustomerBell>('/bells', { place }); setSent(b.id); }
    catch (e) { onError((e as Error).message); }
  };
  const exit = () => { if (window.confirm('호출벨 화면을 끌까요? (직원용)')) onExit(); };
  return (
    <div className="fixed inset-0 z-[45] flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-sky-600 to-blue-800 p-8 text-center text-white">
      <button onClick={exit} aria-label="호출벨 화면 끄기" className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] rounded-full bg-white/10 p-2 text-white/60"><X className="size-5" /></button>
      <div>
        <p className="text-lg font-bold text-sky-100">{place}</p>
        <h1 className="mt-2 text-[34px] font-black [word-break:keep-all]">도움이 필요하신가요?</h1>
      </div>
      {mine?.answeredAt ? (
        <div className="space-y-4">
          <div className="text-7xl">🙋</div>
          <p className="text-3xl font-black">직원이 가고 있습니다</p>
          <p className="text-lg text-sky-100">{mine.answeredBy?.dept} 담당 직원이 곧 도와드리겠습니다.</p>
          <button onClick={() => setSent(null)} className="rounded-2xl bg-white/15 px-8 py-3 font-bold">처음 화면으로</button>
        </div>
      ) : sent ? (
        <div className="space-y-4">
          <div className="text-7xl motion-safe:animate-bounce">🔔</div>
          <p className="text-3xl font-black">직원을 부르고 있습니다</p>
          <p className="text-lg text-sky-100">잠시만 기다려 주세요.</p>
          <button onClick={press} className="rounded-2xl bg-white/15 px-8 py-3 font-bold">한 번 더 부르기</button>
        </div>
      ) : (
        <button onClick={press} className="grid size-64 place-items-center rounded-full bg-white text-blue-700 shadow-2xl ring-8 ring-white/30 active:scale-95">
          <span><span className="block text-7xl">🔔</span><span className="mt-2 block text-3xl font-black">직원 호출</span></span>
        </button>
      )}
      <p className="text-base text-sky-100 [word-break:keep-all]">버튼을 누르시면 매장 직원에게 바로 알림이 갑니다.</p>
    </div>
  );
}
