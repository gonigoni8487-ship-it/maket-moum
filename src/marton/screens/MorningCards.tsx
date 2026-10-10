import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import { storeDayStart, storeTime } from '../shared';
import { morningMusicUrl, speak } from '../alerts';
import { quoteSource, todaysQuotes } from '../quotes';
import { cx } from '../ui';

const CARD_MS = 10000; // 한 장 10초 × 5장 = 50초 (1분 이내)
const MUSIC_MAX_MS = 56000;
const DAY = 24 * 60 * 60 * 1000;

// 카드마다 다른 아침 하늘 (사진 대신 그라데이션)
const SKIES = [
  'radial-gradient(120% 80% at 70% 100%, #f59e0b 0%, #b45309 18%, #3b1d4a 48%, #0f172a 80%)',
  'radial-gradient(120% 80% at 20% 0%, #0ea5e9 0%, #1e3a8a 40%, #0b1022 85%)',
  'radial-gradient(120% 90% at 80% 10%, #10b981 0%, #065f46 35%, #0b1a14 85%)',
  'radial-gradient(120% 90% at 30% 90%, #fb7185 0%, #9f1239 30%, #2a0a1a 80%)',
  'radial-gradient(120% 90% at 50% 100%, #fde68a 0%, #d97706 20%, #7c2d12 45%, #1c1008 85%)',
];

/** 앱을 열 때마다 오늘의 명언을 먼저 보여 준다 (앱 안에서 화면을 옮길 때는 다시 뜨지 않음) */
export const MORNING_KEY = 'marton-quotes-shown';
export function shouldShowMorning() {
  try { return sessionStorage.getItem(MORNING_KEY) !== '1'; } catch { return true; }
}
export function markMorningSeen() {
  try { sessionStorage.setItem(MORNING_KEY, '1'); } catch { /* 저장 불가 */ }
}
/** 시간대 인사 */
const greeting = (hour: number) => (hour < 11 ? '좋은 아침입니다' : hour < 17 ? '오늘도 힘내세요' : '오늘 하루도 수고 많으셨습니다');

/** 아침 명언 5장: 배경음악과 함께 10초씩 넘어가는 카드뉴스 */
export default function MorningCards({ name, onClose }: { name?: string; onClose: () => void }) {
  const t = storeTime(Date.now());
  const quotes = todaysQuotes(Math.floor(storeDayStart(Date.now()) / DAY));
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const music = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<number | null>(null);
  const q = quotes[i];
  const last = i === quotes.length - 1;

  const fadeOut = () => {
    const a = music.current;
    if (!a) return;
    const step = window.setInterval(() => {
      a.volume = Math.max(0, a.volume - 0.08);
      if (a.volume <= 0.01) { a.pause(); clearInterval(step); }
    }, 80);
  };
  const close = () => { fadeOut(); if ('speechSynthesis' in window) speechSynthesis.cancel(); onClose(); };

  const start = () => {
    const a = new Audio(morningMusicUrl());
    a.volume = 0.55;
    void a.play().catch(() => { /* 음악이 막혀도 카드는 넘어간다 */ });
    window.setTimeout(fadeOut, MUSIC_MAX_MS);
    music.current = a;
    setStarted(true);
  };
  useEffect(() => () => { music.current?.pause(); }, []);

  // 10초마다 다음 장, 마지막 장에서 멈춤
  useEffect(() => {
    if (!started || paused || last) return;
    timer.current = window.setTimeout(() => setI(n => Math.min(n + 1, quotes.length - 1)), CARD_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [started, paused, i, last, quotes.length]);

  // 읽어 주기: 음악을 줄이고 명언과 출처를 읽는다
  useEffect(() => {
    if (!started || !readAloud) return;
    const a = music.current;
    if (a) a.volume = 0.2;
    speak(`${q.text.replace(/\n/g, ' ')} ${q.who}${q.book ? `, ${q.book.replace(/[『』「」]/g, '')}` : ''}`, () => { if (a) a.volume = 0.55; });
  }, [started, readAloud, i]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const a = music.current;
    if (!a || !started) return;
    if (paused) a.pause(); else if (a.paused) void a.play().catch(() => {});
  }, [paused, started]);

  const go = (d: number) => setI(n => Math.max(0, Math.min(quotes.length - 1, n + d)));

  return (
    <div className="fixed inset-0 z-[35] overflow-hidden bg-slate-950 text-white" role="dialog" aria-modal="true" aria-label="오늘의 명언">
      <div key={i} className="absolute -inset-[10%] motion-safe:animate-[morning-drift_12s_ease-out_forwards]" style={{ background: SKIES[i % SKIES.length] }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_0%,rgba(0,0,0,0.35)_80%)]" />

      <div className="relative mx-auto flex h-full max-w-md flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
        {/* 진행 막대 */}
        <div className="flex gap-1.5">
          {quotes.map((_, k) => (
            <div key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <div className={cx('h-full rounded-full bg-white', k < i && 'w-full', k > i && 'w-0', k === i && (started && !last ? 'motion-safe:animate-[morning-bar_10s_linear_forwards]' : 'w-full'))}
                style={k === i && paused ? { animationPlayState: 'paused' } : undefined} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="font-bold text-white/90">☀️ 마트ON 오늘의 명언</span>
          <span className="text-white/60">{t.month}월 {t.date}일</span>
          <span className="ml-auto flex gap-1">
            {started && <button onClick={() => setReadAloud(r => !r)} aria-label={readAloud ? '읽어 주기 끄기' : '읽어 주기'} className="rounded-full bg-white/10 p-2">{readAloud ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}</button>}
            {started && <button onClick={() => setPaused(p => !p)} aria-label={paused ? '계속' : '멈춤'} className="rounded-full bg-white/10 p-2">{paused ? <Play className="size-4" /> : <Pause className="size-4" />}</button>}
            <button onClick={close} aria-label="닫기" className="rounded-full bg-white/10 p-2"><X className="size-4" /></button>
          </span>
        </div>

        {/* 카드 본문: 화면 왼쪽·오른쪽을 눌러 넘기기 */}
        <div className="relative flex flex-1 flex-col justify-center" onClick={e => { if (!started) return; const r = e.currentTarget.getBoundingClientRect(); go(e.clientX - r.left < r.width / 3 ? -1 : 1); }}>
          <div key={`q${i}`} className="space-y-7 motion-safe:animate-[morning-rise_0.9s_ease-out_both]">
            <p className="text-center text-[26px] font-black leading-tight text-yellow-300 [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]">
              오늘을 여는 명언 {i + 1}
            </p>
            <p className="whitespace-pre-line text-center text-[23px] font-bold leading-[1.6] [text-shadow:0_2px_10px_rgba(0,0,0,0.7)] [word-break:keep-all]">
              “{q.text}”
            </p>
            <p className="text-center text-[15px] font-semibold text-yellow-200/90 [word-break:keep-all]">{quoteSource(q)}</p>
            <div className="mx-auto w-fit rounded-2xl bg-black/35 px-4 py-2.5 text-center text-[15px] backdrop-blur-sm [word-break:keep-all]">
              <span className="font-bold text-emerald-300">오늘의 실천</span> · {q.today}
            </div>
          </div>
        </div>

        {!started ? (
          <div className="space-y-3 text-center">
            <p className="text-lg font-bold">{greeting(t.hour)}{name ? `, ${name}님` : ''} ☀️</p>
            <p className="text-sm text-white/70">오늘의 명언 5가지 · 배경음악과 함께 50초</p>
            <button onClick={start} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-300 py-4 text-lg font-black text-slate-900 active:bg-yellow-400"><Play className="size-5" />음악과 함께 보기</button>
            <button onClick={close} className="w-full py-2 text-sm text-white/60">건너뛰기</button>
          </div>
        ) : last ? (
          <button onClick={close} className="w-full rounded-2xl bg-yellow-300 py-4 text-lg font-black text-slate-900 motion-safe:animate-[morning-rise_0.9s_ease-out_both]">오늘 하루 시작하기 💪</button>
        ) : (
          <p className="text-center text-xs text-white/50">화면 오른쪽을 누르면 다음, 왼쪽은 이전</p>
        )}
      </div>
    </div>
  );
}
