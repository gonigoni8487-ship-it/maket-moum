import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Search, Sparkles, MapPin, Send, X, Keyboard, Maximize2, Volume2 } from 'lucide-react';
import { bayText, floorText, promotionFor, questionKeywords, type AskResult, type Product, type Promotion } from '../shared';
import { api } from '../api';
import { speak } from '../alerts';
import { cx, Examples, Empty, inputCls, won, type Draft } from '../ui';

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();

export function ProductRow({ p, promo, onRequest, onShow }: { p: Product; promo?: Promotion; onRequest: (d: Draft) => void; onShow?: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-slate-900">{p.name}</div>
          <div className="mt-1 flex items-start gap-1 text-sm font-semibold text-blue-700">
            <MapPin className="mt-0.5 size-4 shrink-0" />{p.floor} · {p.corner} · {bayText(p)}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {promo?.price && promo.price !== p.price && <s className="block text-xs text-slate-400">{won(p.price)}</s>}
          <div className={cx('text-sm font-bold', promo?.price ? 'text-pink-600' : 'text-slate-900')}>{won(promo?.price ?? p.price)}</div>
        </div>
      </div>
      {promo && (
        <div className="mt-2 rounded-lg bg-pink-50 px-2.5 py-1.5 text-xs font-bold text-pink-700">
          이번 주 행사{promo.condition ? ` · ${promo.condition}` : ''}{promo.period ? <span className="font-normal text-pink-600"> · {promo.period}</span> : null}
        </div>
      )}
      {onShow && (
        <button onClick={onShow} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-50 py-2.5 text-sm font-bold text-blue-700 active:bg-blue-100">
          <Maximize2 className="size-4" />고객에게 크게 보여주기
        </button>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{p.dept} · {p.barcode}</span>
        <button
          onClick={() => onRequest({ toDept: p.dept, category: '상품 위치 확인', title: `${p.name} 위치/재고 확인`, detail: `등록 위치: ${p.floor} ${p.corner} ${bayText(p)}` })}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-700"
        >
          <Send className="size-3.5" />{p.dept}에 확인 요청
        </button>
      </div>
    </div>
  );
}

/** 등록된 행사상품 한 줄 */
function PromoCard({ p }: { p: Promotion }) {
  return (
    <div className="rounded-xl bg-white px-3.5 py-2.5 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 font-semibold">{p.name}{p.spec && <span className="ml-1 font-normal text-slate-500">{p.spec}</span>}</span>
        <span className="shrink-0 text-right">
          {p.originalPrice && p.originalPrice !== p.price && <s className="mr-1 text-xs text-slate-400">{won(p.originalPrice)}</s>}
          {p.price ? <b className="text-pink-600">{won(p.price)}</b> : null}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
        {p.condition && <span className="rounded bg-pink-100 px-1.5 font-bold text-pink-700">{p.condition}</span>}
        {p.code && <span className="font-mono">{p.code}</span>}
        {p.period && <span>{p.period}</span>}
      </div>
    </div>
  );
}

const speechRecognition = () => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

/** 듣는 중 화면: 말하는 내용이 바로 보이고, 음성 인식이 안 되는 브라우저면 키보드 마이크를 안내 */
function ListenSheet({ onHeard, onClose, onKeyboard }: { onHeard: (text: string) => void; onClose: () => void; onKeyboard: () => void }) {
  const [interim, setInterim] = useState('');
  const [problem, setProblem] = useState<string | null>(() => (speechRecognition() ? null : 'unsupported'));
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = speechRecognition();
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let done = false;
    rec.onresult = (e: any) => {
      if (done) return; // 닫힌 뒤 늦게 온 결과는 무시
      const text = [...e.results].map((r: any) => r[0].transcript).join('');
      setInterim(text);
      if (e.results[e.results.length - 1].isFinal && text.trim()) { done = true; onHeard(text.trim()); }
    };
    rec.onerror = (e: any) => setProblem(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : e.error === 'no-speech' ? 'silent' : 'failed');
    rec.onend = () => { if (!done) setProblem(p => p ?? 'silent'); };
    recRef.current = rec;
    try { rec.start(); } catch { setProblem('failed'); }
    return () => { done = true; try { rec.abort(); } catch { /* 이미 끝남 */ } };
  }, []);

  const retry = () => { setProblem(null); setInterim(''); try { recRef.current?.start(); } catch { setProblem('failed'); } };
  const message: Record<string, string> = {
    unsupported: '이 브라우저(네이버·카카오톡 앱 안 브라우저 등)는 음성 인식을 지원하지 않습니다. 키보드의 🎤 마이크 버튼으로 말하거나, Chrome·삼성 인터넷·Safari로 열어 홈 화면에 추가해 주세요.',
    denied: '마이크 사용이 막혀 있습니다. 주소창의 자물쇠(또는 설정) → 마이크 허용 후 다시 눌러 주세요.',
    silent: '말소리를 듣지 못했습니다. 휴대폰을 입 가까이 대고 다시 말해 주세요.',
    failed: '음성 인식을 시작하지 못했습니다. 다시 시도하거나 키보드로 입력해 주세요.',
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" role="dialog" aria-modal="true" aria-label="말로 상품 찾기" onClick={onClose}>
      <div className="space-y-5 rounded-t-3xl bg-white px-5 pb-8 pt-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">말로 상품 찾기</h2>
          <button onClick={onClose} aria-label="닫기" className="rounded-full p-2 text-slate-500 active:bg-slate-100"><X className="size-5" /></button>
        </div>
        {!problem ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <span className="grid size-24 place-items-center rounded-full bg-red-600 text-white shadow-[0_0_0_12px_rgba(220,38,38,0.15)] motion-safe:animate-pulse"><Mic className="size-11" /></span>
            <p className="min-h-14 text-2xl font-bold text-slate-900">{interim || '듣고 있어요…'}</p>
            <div className="w-full"><Examples title="예시) 고객 질문을 그대로 말해 보세요" items={["오뎅은 어디 있어요?", "이번 주 갈치 얼마예요?", "고등어 행사해요?", "라면 코너 어디예요?"]} /></div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-[15px] leading-relaxed text-amber-900">{message[problem]}</p>
            <div className="grid grid-cols-2 gap-2">
              {problem !== 'unsupported' && <button onClick={retry} className="flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-3.5 font-bold text-white"><Mic className="size-5" />다시 말하기</button>}
              <button onClick={onKeyboard} className={cx('flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-3.5 font-bold text-white', problem === 'unsupported' && 'col-span-2')}><Keyboard className="size-5" />키보드로 입력</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 고객에게 보여 주는 큰 글씨 위치 안내 (화면 아무 곳이나 누르면 닫힘) */
function CustomerCard({ p, promo, onClose }: { p: Product; promo?: Promotion; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white px-6 text-center" role="dialog" aria-modal="true" aria-label={`${p.name} 위치`} onClick={onClose}>
      <p className="text-2xl font-bold text-slate-600">{p.name}</p>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-slate-600">{floorText(p.floor)} · {p.corner}</p>
        {p.bay
          ? <>
              <p className="text-7xl font-black tracking-tight text-blue-700">{p.bay}번 매대</p>
              {p.slot && <p className="text-4xl font-black text-slate-900">{p.slot === 1 ? '첫' : p.slot}번째 칸</p>}
            </>
          : <p className="text-4xl font-black text-blue-700 [text-wrap:balance]">{p.shelf}</p>}
      </div>
      <div className="space-y-2">
        <p className="text-3xl font-black text-slate-900">{won(promo?.price ?? p.price)}</p>
        {promo?.condition && <p className="inline-block rounded-xl bg-pink-100 px-4 py-1.5 text-xl font-black text-pink-700">행사 {promo.condition}</p>}
      </div>
      <p className="absolute bottom-8 text-sm text-slate-400">화면을 누르면 닫힙니다</p>
    </div>
  );
}

export default function ProductFinder({ products, promotions, onRequest, onError }: {
  products: Product[]; promotions: Promotion[]; onRequest: (d: Draft) => void; onError: (m: string) => void;
}) {
  const [q, setQ] = useState('');
  const [ai, setAi] = useState<AskResult | null>(null);
  const [asking, setAsking] = useState(false);
  const [listening, setListening] = useState(false);
  const [showing, setShowing] = useState<Product | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 매장 상품 목록에 없는 전단 상품도 찾을 수 있게 행사상품에서도 찾는다
  const promoHits = useMemo(() => {
    const words = questionKeywords(q).map(norm).filter(w => w.length >= 2);
    const code = q.replace(/\D/g, '');
    if (!words.length && code.length < 8) return [];
    return promotions.filter(p => (code.length >= 8 && p.code === code) || words.some(w => norm(p.name).includes(w))).slice(-10).reverse();
  }, [q, promotions]);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    if (/^\d{8,14}$/.test(q.trim())) return products.filter(p => p.barcode === q.trim());
    const words = questionKeywords(q).map(norm);
    return products.filter(p => [p.name, ...p.aliases, p.corner].map(norm).some(x => words.some(w => (w.length >= 2 && x.includes(w)) || x === w || (x.length >= 2 && w.includes(x)))));
  }, [q, products]);

  const ask = async (question = q) => {
    if (!question.trim()) return;
    setAsking(true);
    try {
      const r = await api<AskResult>('/ai/ask', { question });
      setAi(r);
      speak(r.speech ?? r.answer);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setAsking(false);
    }
  };

  const heard = (said: string) => {
    setListening(false);
    setAi(null);
    setQ(said);
    void ask(said);
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setListening(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-[16px] font-black text-white active:bg-red-700">
        <Mic className="size-5" />말로 상품 찾기 (고객 응대)
      </button>
      <Examples title="예시) 고객 질문을 그대로 말해 보세요" items={["오뎅은 어디 있어요?", "이번 주 갈치 얼마예요?", "고등어 행사해요?", "라면 코너 어디예요?"]} />

      <form onSubmit={e => { e.preventDefault(); void ask(); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input ref={inputRef} enterKeyHint="search" className={cx(inputCls, 'pl-9')} value={q} onChange={e => { setQ(e.target.value); setAi(null); }} placeholder="상품명·바코드 또는 “연어 어디 있어요?”" />
        </div>
        <button type="button" onClick={() => setListening(true)} className="rounded-xl bg-slate-800 px-3.5 text-white" aria-label="말로 상품 찾기">
          <Mic className="size-5" />
        </button>
      </form>

      <button onClick={() => ask()} disabled={!q.trim() || asking} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50">
        <Sparkles className="size-4" />{asking ? '찾는 중…' : '위치·행사 물어보기'}
      </button>

      {ai && (
        <div className="rounded-2xl bg-indigo-50 p-4 text-[15px] font-medium leading-relaxed text-indigo-950">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-xs font-bold text-indigo-600"><Volume2 className="size-3.5" />고객 안내</span>
            <button type="button" onClick={() => speak(ai.speech ?? ai.answer)} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 active:bg-indigo-100"><Volume2 className="size-3.5" />다시 듣기</button>
          </div>
          {ai.answer}
        </div>
      )}

      {q.trim() && (results.length
        ? results.map(p => <ProductRow key={p.id} p={p} promo={promotionFor(p, promotions)} onRequest={onRequest} onShow={() => setShowing(p)} />)
        : !ai && !promoHits.length && <Empty>일치하는 상품이 없습니다. AI에게 물어보세요.</Empty>)}

      {q.trim() && promoHits.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-700">이번 행사상품 <span className="font-normal text-slate-400">{promoHits.length}개</span></h3>
          {promoHits.map(p => <PromoCard key={p.id} p={p} />)}
        </div>
      )}

      {!q.trim() && promotions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-700">등록된 행사상품 <span className="font-normal text-slate-400">{promotions.length}개</span></h3>
          {promotions.slice(-20).reverse().map(p => <PromoCard key={p.id} p={p} />)}
        </div>
      )}
      {listening && <ListenSheet onHeard={heard} onClose={() => setListening(false)} onKeyboard={() => { setListening(false); setTimeout(() => inputRef.current?.focus(), 50); }} />}
      {showing && <CustomerCard p={showing} promo={promotionFor(showing, promotions)} onClose={() => setShowing(null)} />}
    </div>
  );
}
