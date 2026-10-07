import { useEffect, useRef, useState } from 'react';
import { Mic, X, Send, RotateCcw, Pencil, Siren, Keyboard } from 'lucide-react';
import { DEPARTMENTS, TASK_CATEGORIES, parseRequestText, type Department, type Product, type Task, type TaskCategory } from '../shared';
import { api } from '../api';
import { send as sendOrQueue } from '../outbox';
import { speak } from '../alerts';
import { Chip, cx, inputCls, type Draft } from '../ui';

type Phase = 'listening' | 'thinking' | 'review' | 'typing';

const EXAMPLES = ['수산에 고객응대 요청, 고객센터 앞', '3번 계산대 가격 오류 가공', '화장지 품절이에요 보충 부탁', '보안 지금 바로 출입구 앞으로'];

function recognizer() {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = 'ko-KR';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

/**
 * 말하면 연결: 음성 → 부서·유형·위치·긴급 해석 → 확인 후 한 번에 전송.
 * 음성 인식이 안 되는 기기는 같은 해석기로 문장 입력을 받는다.
 */
export default function VoiceRequest({ products, aiEnabled, voice, onSent, onEdit, onClose, onError }: {
  products: Product[]; aiEnabled: boolean; voice: boolean;
  onSent: (t: Task | null) => void; onEdit: (d: Draft) => void; onClose: () => void; onError: (m: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>('listening');
  const [interim, setInterim] = useState('');
  const [typed, setTyped] = useState('');
  const [said, setSaid] = useState('');
  const [toDept, setToDept] = useState<Department | undefined>();
  const [category, setCategory] = useState<TaskCategory | undefined>();
  const [location, setLocation] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const recRef = useRef<any>(null);

  const interpret = async (text: string) => {
    setSaid(text);
    setPhase('thinking');
    const r = parseRequestText(text, products);
    let { toDept: d, category: c, location: l, urgent: u } = r;
    if (!r.complete && aiEnabled) {
      try {
        const ai = await api<{ toDept?: Department; category?: TaskCategory; location?: string; urgent?: boolean }>('/ai/parse-request', { text });
        d ??= ai.toDept;
        c ??= ai.category ?? (d ? '고객응대 요청' : undefined);
        l ??= ai.location;
        u ||= Boolean(ai.urgent);
      } catch { /* 규칙 결과만 사용 */ }
    }
    setToDept(d);
    setCategory(c);
    setLocation(l ?? '');
    setUrgent(u);
    setTitle([d, r.product?.name, c].filter(Boolean).join(' ') || text.slice(0, 40));
    setPhase('review');
    if (voice && d && c) speak(`${d}에 ${c}${l ? `, ${l}` : ''}${u ? ', 긴급' : ''}. 보낼까요?`);
  };

  const listen = () => {
    const rec = recognizer();
    if (!rec) return setPhase('typing');
    recRef.current?.abort?.();
    recRef.current = rec;
    setInterim('');
    setPhase('listening');
    let finalText = '';
    rec.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText = text;
      }
      setInterim(text);
    };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        onError('마이크 권한이 없습니다. 브라우저 설정에서 마이크를 허용하거나 글로 입력해 주세요.');
        setPhase('typing');
      }
    };
    rec.onend = () => {
      if (finalText.trim()) void interpret(finalText.trim());
      else setPhase(p => (p === 'listening' ? 'typing' : p));
    };
    rec.start();
  };

  useEffect(() => {
    listen();
    return () => recRef.current?.abort?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async () => {
    if (!toDept || !category) return;
    setBusy(true);
    try {
      const task = await sendOrQueue<Task>('/tasks', { toDept, category, title, location, urgent, detail: `🎤 "${said}"` }, `요청: ${title}`);
      if (voice) speak(task ? `${toDept}에 요청을 보냈습니다.` : '연결되면 자동으로 보내겠습니다.');
      onSent(task);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-slate-900/60" onClick={onClose}>
      <div className="mx-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">말로 요청하기</h2>
          <button onClick={onClose} aria-label="닫기" className="rounded-lg p-1 text-slate-500"><X className="size-5" /></button>
        </div>

        {(phase === 'listening' || phase === 'thinking') && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <button
              onClick={() => (phase === 'listening' ? recRef.current?.stop?.() : undefined)}
              className={cx('grid size-24 place-items-center rounded-full text-white', phase === 'listening' ? 'animate-pulse bg-red-600' : 'bg-slate-400')}
              aria-label="말하기 끝내기"
            >
              <Mic className="size-10" />
            </button>
            <p className="min-h-6 text-lg font-bold text-slate-900">{interim || (phase === 'thinking' ? said : '듣고 있어요…')}</p>
            <p className="text-sm text-slate-500">{phase === 'thinking' ? '요청 내용을 정리하는 중…' : '예) "수산에 고객응대 요청, 고객센터 앞"'}</p>
            {phase === 'listening' && (
              <button onClick={() => { recRef.current?.abort?.(); setPhase('typing'); }} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500">
                <Keyboard className="size-4" />글로 입력
              </button>
            )}
          </div>
        )}

        {phase === 'typing' && (
          <form onSubmit={e => { e.preventDefault(); if (typed.trim()) void interpret(typed.trim()); }} className="space-y-3">
            <p className="text-sm text-slate-500">음성 인식을 쓸 수 없어 글로 받습니다. 말하듯이 적어 주세요.</p>
            <input autoFocus className={inputCls} value={typed} onChange={e => setTyped(e.target.value)} placeholder="수산에 고객응대 요청, 고객센터 앞" maxLength={300} />
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map(x => <button key={x} type="button" onClick={() => setTyped(x)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">{x}</button>)}
            </div>
            <button className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white disabled:opacity-50" disabled={!typed.trim()}>해석하기</button>
          </form>
        )}

        {phase === 'review' && (
          <div className="space-y-4">
            <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">🎤 “{said}”</p>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-500">받는 부서{!toDept && <span className="text-red-600"> — 선택해 주세요</span>}</span>
              <div className="flex flex-wrap gap-1.5">
                {DEPARTMENTS.map(d => <Chip key={d} active={toDept === d} onClick={() => setToDept(d)}>{d}</Chip>)}
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-500">유형{!category && <span className="text-red-600"> — 선택해 주세요</span>}</span>
              <div className="flex flex-wrap gap-1.5">
                {TASK_CATEGORIES.map(c => <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>)}
              </div>
            </div>
            <input className={inputCls} value={location} onChange={e => setLocation(e.target.value)} placeholder="위치 (없으면 비워 두세요)" maxLength={60} />
            <button
              type="button"
              onClick={() => setUrgent(u => !u)}
              className={cx('flex w-full items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-bold', urgent ? 'border-red-600 bg-red-600 text-white' : 'border-red-200 text-red-600')}
            >
              <Siren className="size-4" />{urgent ? '긴급' : '일반 (눌러서 긴급)'}
            </button>

            <button onClick={send} disabled={busy || !toDept || !category} className={cx('flex w-full items-center justify-center gap-2 rounded-xl py-4 text-[16px] font-black text-white disabled:opacity-50', urgent ? 'bg-red-600' : 'bg-blue-600')}>
              <Send className="size-5" />{busy ? '보내는 중…' : `${toDept ?? '부서'}에 보내기`}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={listen} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700"><RotateCcw className="size-4" />다시 말하기</button>
              <button
                onClick={() => onEdit({ toDept, category, title, location, urgent, detail: `🎤 "${said}"` })}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700"
              >
                <Pencil className="size-4" />자세히 수정
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
