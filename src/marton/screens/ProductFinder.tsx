import { useMemo, useState } from 'react';
import { Mic, Search, Sparkles, MapPin, Send } from 'lucide-react';
import type { AskResult, Product, Promotion } from '../shared';
import { api } from '../api';
import { speak } from '../alerts';
import { cx, Empty, inputCls, won, type Draft } from '../ui';

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();

export function ProductRow({ p, promo, onRequest }: { p: Product; promo?: Promotion; onRequest: (d: Draft) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-slate-900">{p.name}</div>
          <div className="mt-1 flex items-center gap-1 text-sm font-semibold text-blue-700">
            <MapPin className="size-4" />{p.floor} · {p.corner} · {p.shelf}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-slate-900">{won(promo?.price ?? p.price)}</div>
          {promo && <div className="mt-0.5 rounded bg-pink-100 px-1.5 text-[11px] font-bold text-pink-700">행사 {promo.condition || ''}</div>}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{p.dept} · {p.barcode}</span>
        <button
          onClick={() => onRequest({ toDept: p.dept, category: '상품 위치 확인', title: `${p.name} 위치/재고 확인`, detail: `등록 위치: ${p.floor} ${p.corner} ${p.shelf}` })}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-700"
        >
          <Send className="size-3.5" />{p.dept}에 확인 요청
        </button>
      </div>
    </div>
  );
}

export function promotionFor(p: Product, promotions: Promotion[]) {
  const key = norm(p.name);
  return promotions.find(pr => { const n = norm(pr.name); return key.includes(n) || n.includes(key) || p.aliases.some(a => n.includes(norm(a))); });
}

export default function ProductFinder({ products, promotions, onRequest, onError }: {
  products: Product[]; promotions: Promotion[]; onRequest: (d: Draft) => void; onError: (m: string) => void;
}) {
  const [q, setQ] = useState('');
  const [ai, setAi] = useState<AskResult | null>(null);
  const [asking, setAsking] = useState(false);
  const [listening, setListening] = useState(false);

  const results = useMemo(() => {
    const n = norm(q);
    if (!n) return [];
    return products.filter(p => p.barcode === q.trim() || [p.name, ...p.aliases, p.corner].some(x => norm(x).includes(n) || n.includes(norm(x))));
  }, [q, products]);

  const ask = async (question = q) => {
    if (!question.trim()) return;
    setAsking(true);
    try {
      const r = await api<AskResult>('/ai/ask', { question });
      setAi(r);
      speak(r.answer);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setAsking(false);
    }
  };

  const listen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return onError('이 기기는 음성 입력을 지원하지 않습니다.');
    const rec = new SR();
    rec.lang = 'ko-KR';
    rec.onresult = (e: any) => {
      const said = e.results[0][0].transcript as string;
      setQ(said);
      void ask(said);
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={e => { e.preventDefault(); void ask(); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className={cx(inputCls, 'pl-9')} value={q} onChange={e => { setQ(e.target.value); setAi(null); }} placeholder="상품명·바코드 또는 “연어 어디 있어요?”" />
        </div>
        <button type="button" onClick={listen} className={cx('rounded-xl px-3.5 text-white', listening ? 'bg-red-600 animate-pulse' : 'bg-slate-800')} aria-label="음성으로 묻기">
          <Mic className="size-5" />
        </button>
      </form>

      <button onClick={() => ask()} disabled={!q.trim() || asking} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50">
        <Sparkles className="size-4" />{asking ? 'AI가 찾는 중…' : 'AI에게 위치 묻기'}
      </button>

      {ai && (
        <div className="rounded-2xl bg-indigo-50 p-4 text-[15px] font-medium leading-relaxed text-indigo-950">
          <div className="mb-1 flex items-center gap-1 text-xs font-bold text-indigo-600"><Sparkles className="size-3.5" />AI 답변</div>
          {ai.answer}
        </div>
      )}

      {q.trim() && (results.length
        ? results.map(p => <ProductRow key={p.id} p={p} promo={promotionFor(p, promotions)} onRequest={onRequest} />)
        : !ai && <Empty>일치하는 상품이 없습니다. AI에게 물어보세요.</Empty>)}

      {!q.trim() && promotions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-700">등록된 행사상품</h3>
          {promotions.slice(-10).reverse().map(p => (
            <div key={p.id} className="flex justify-between rounded-xl bg-white px-3.5 py-2.5 text-sm">
              <span className="font-semibold">{p.name} <span className="text-pink-600">{p.condition}</span></span>
              <span className="text-slate-500">{won(p.price)} {p.period}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
