// 실적 지표: 영업부서별 일·월·년 실적 입력, 지표 공식 계산, 통계, 말로 묻기 (영업기밀 — 관리자·승인된 시니어만)
import type { Actor, Staff } from './shared';

export const SALES_DEPTS = ['수산', '축산', '농산', '가공', '생활문화'] as const;
export type SalesDept = (typeof SALES_DEPTS)[number];
export type KpiPeriod = 'day' | 'month' | 'year';
export const PERIOD_LABEL: Record<KpiPeriod, string> = { day: '일', month: '월', year: '년' };

/** 입력하는 금액 (모두 원) */
export interface KpiFigures {
  /** 총매출 */
  gross?: number;
  /** 순매출 (= 실적) */
  net?: number;
  /** 목표 */
  target?: number;
  /** 전년실적 (신장율로 입력하면 계산해서 넣는다) */
  lastYear?: number;
  /** 이익액 */
  profit?: number;
  /** 폐기금액 */
  waste?: number;
  /** 로스금액 */
  loss?: number;
  /** 시식금액 */
  tasting?: number;
  /** 할인에누리액 */
  markdown?: number;
  /** 합계일 때: 항목마다 그 항목이 입력된 날들의 순매출 합 (빠진 날 때문에 비율이 낮아 보이지 않게) */
  basis?: Partial<Record<FigureKey, number>>;
}
type FigureKey = 'gross' | 'net' | 'target' | 'lastYear' | 'profit' | 'waste' | 'loss' | 'tasting' | 'markdown';
export const FIGURE_FIELDS: { key: FigureKey; label: string }[] = [
  { key: 'gross', label: '총매출' },
  { key: 'net', label: '순매출' },
  { key: 'target', label: '목표' },
  { key: 'lastYear', label: '전년실적' },
  { key: 'profit', label: '이익액' },
  { key: 'waste', label: '폐기금액' },
  { key: 'loss', label: '로스금액' },
  { key: 'tasting', label: '시식금액' },
  { key: 'markdown', label: '할인에누리액' },
];

export interface KpiRecord {
  id: string;
  period: KpiPeriod;
  /** day: 2026-10-10, month: 2026-10, year: 2026 */
  key: string;
  dept: SalesDept;
  figures: KpiFigures;
  by: Actor;
  at: number;
  source?: 'manual' | 'photo';
}

/** 실적 지표를 볼 수 있는 사람: 점장·부점장 + 관리자가 허락한 시니어 담당 (주니어는 안 됨) */
export const canSeeKpi = (s: Pick<Staff, 'id' | 'role' | 'level'>, approved: string[] = []) =>
  s.role === 'manager' || (s.level === '시니어' && approved.includes(s.id));

export const PERIOD_FORMAT: Record<KpiPeriod, RegExp> = {
  day: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  month: /^\d{4}-(0[1-9]|1[0-2])$/,
  year: /^\d{4}$/,
};

// ---- 지표 공식 (지표 실적 공식표 그대로) ----
const rate = (a?: number, b?: number) => (a !== undefined && b ? (a / b) * 100 : null);
/** 항목이 입력된 날들의 순매출 (합계가 아니면 순매출 그대로) */
const netFor = (f: KpiFigures, k: FigureKey) => f.basis?.[k] ?? f.net;
/** 전년실적 = 금년실적 × 100 ÷ (100 + 신장율) */
export const lastYearFromGrowth = (net: number, growth: number) => Math.round((net * 100) / (100 + growth));

export interface KpiRates {
  /** 원가영향액 = 폐기금액 + 로스금액 + 시식금액 */
  costImpact: number;
  /** 총할인금액 = 원가영향액 + 할인에누리액 */
  totalDiscount: number;
  /** 총할인율 = 총할인금액 ÷ 순매출 × 100 */
  totalDiscountRate: number | null;
  /** 달성율 = 실적 ÷ 목표 × 100 */
  achievement: number | null;
  /** 신장율 = (금년실적 ÷ 전년실적) × 100 − 100 */
  growth: number | null;
  /** 이익율 = 이익액 ÷ 순매출 × 100 */
  profitRate: number | null;
  wasteRate: number | null;
  tastingRate: number | null;
  lossRate: number | null;
  markdownRate: number | null;
  /** 구성비 = 부서 순매출 ÷ 전체 순매출 × 100 */
  share: number | null;
}

export function kpiRates(f: KpiFigures, totalNet?: number): KpiRates {
  const costImpact = (f.waste ?? 0) + (f.loss ?? 0) + (f.tasting ?? 0);
  const totalDiscount = costImpact + (f.markdown ?? 0);
  const anyDiscount = [f.waste, f.loss, f.tasting, f.markdown].some(v => v !== undefined);
  const g = rate(netFor(f, 'lastYear'), f.lastYear);
  return {
    costImpact,
    totalDiscount,
    // 할인 항목이 입력된 날들의 순매출 기준
    totalDiscountRate: anyDiscount ? rate(totalDiscount, Math.max(...(['waste', 'loss', 'tasting', 'markdown'] as const).map(k => (f[k] !== undefined ? netFor(f, k) ?? 0 : 0)))) : null,
    achievement: rate(netFor(f, 'target'), f.target),
    growth: g === null ? null : g - 100,
    profitRate: rate(f.profit, netFor(f, 'profit')),
    wasteRate: rate(f.waste, netFor(f, 'waste')),
    tastingRate: rate(f.tasting, netFor(f, 'tasting')),
    lossRate: rate(f.loss, netFor(f, 'loss')),
    markdownRate: rate(f.markdown, netFor(f, 'markdown')),
    share: rate(f.net, totalNet),
  };
}

// ---- 집계: 일 → 월 → 년 ----
const FIELD_KEYS = FIGURE_FIELDS.map(f => f.key);
export function sumFigures(list: KpiFigures[]): KpiFigures {
  const out: KpiFigures = {};
  const basis: Partial<Record<FigureKey, number>> = {};
  for (const k of FIELD_KEYS) {
    const has = list.filter(f => typeof f[k] === 'number');
    if (!has.length) continue;
    out[k] = has.reduce((a, f) => a + (f[k] as number), 0);
    if (k !== 'net') basis[k] = has.reduce((a, f) => a + (netFor(f, k) ?? 0), 0);
  }
  if (Object.keys(basis).length) out.basis = basis;
  return out;
}
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 한 부서의 기간 실적.
 * 월: 월 단위로 직접 입력한 값이 있으면 그것, 없으면 그 달의 일 실적 합.
 * 년: 년 단위로 직접 입력한 값이 있으면 그것, 없으면 1~12월(위 방식) 합.
 */
export function figuresFor(records: KpiRecord[], period: KpiPeriod, key: string, dept: SalesDept): KpiFigures | null {
  const direct = records.find(r => r.period === period && r.key === key && r.dept === dept);
  if (direct) return direct.figures;
  if (period === 'day') return null;
  if (period === 'month') {
    const days = records.filter(r => r.period === 'day' && r.dept === dept && r.key.startsWith(`${key}-`));
    return days.length ? sumFigures(days.map(r => r.figures)) : null;
  }
  const months = Array.from({ length: 12 }, (_, i) => figuresFor(records, 'month', `${key}-${pad(i + 1)}`, dept)).filter((f): f is KpiFigures => Boolean(f));
  return months.length ? sumFigures(months) : null;
}

export interface KpiRow { dept: SalesDept | '전체'; figures: KpiFigures; rates: KpiRates }
/** 기간 하나의 부서별 + 전체 표 */
export function kpiTable(records: KpiRecord[], period: KpiPeriod, key: string): KpiRow[] {
  const per = SALES_DEPTS.map(dept => ({ dept, figures: figuresFor(records, period, key, dept) })).filter((r): r is { dept: SalesDept; figures: KpiFigures } => Boolean(r.figures));
  if (!per.length) return [];
  const total = sumFigures(per.map(r => r.figures));
  return [
    ...per.map(r => ({ ...r, rates: kpiRates(r.figures, total.net) })),
    { dept: '전체' as const, figures: total, rates: kpiRates(total, total.net) },
  ];
}

/** 추이: 월이면 그 달의 날짜별, 년이면 월별 전체 실적 */
export function kpiTrend(records: KpiRecord[], period: KpiPeriod, key: string): { key: string; label: string; row: KpiRow }[] {
  if (period === 'day') return [];
  const subKeys = period === 'month'
    ? Array.from({ length: new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0)).getUTCDate() }, (_, i) => `${key}-${pad(i + 1)}`)
    : Array.from({ length: 12 }, (_, i) => `${key}-${pad(i + 1)}`);
  const sub: KpiPeriod = period === 'month' ? 'day' : 'month';
  return subKeys.flatMap(k => {
    const row = kpiTable(records, sub, k).find(r => r.dept === '전체');
    return row ? [{ key: k, label: sub === 'day' ? `${Number(k.slice(8))}일` : `${Number(k.slice(5))}월`, row }] : [];
  });
}

// ---- 글자·말 ----
/** 1억 2,345만원 (말할 때는 쉼표 없이: 1억 2345만원) */
export function wonText(n: number | undefined, speech = false) {
  if (n === undefined || !Number.isFinite(n)) return '-';
  const neg = n < 0;
  let v = Math.round(Math.abs(n));
  const eok = Math.floor(v / 1e8);
  v -= eok * 1e8;
  const man = Math.floor(v / 1e4);
  const won = v - man * 1e4;
  const num = (x: number) => (speech ? String(x) : x.toLocaleString('ko-KR'));
  const parts = [eok ? `${num(eok)}억` : '', man ? `${num(man)}만` : '', !eok && won ? num(won) : ''].filter(Boolean);
  return `${neg ? '-' : ''}${parts.join(' ') || '0'}원`;
}
export const pct = (v: number | null, sign = false) => (v === null ? '-' : `${sign && v > 0 ? '+' : ''}${v.toFixed(1)}%`);
const pctSay = (v: number | null, sign = false) => (v === null ? '' : `${sign ? (v >= 0 ? '플러스 ' : '마이너스 ') : ''}${Math.abs(v).toFixed(1)}%`);

export function periodLabel(period: KpiPeriod, key: string) {
  if (period === 'year') return `${key}년`;
  if (period === 'month') return `${key.slice(0, 4)}년 ${Number(key.slice(5))}월`;
  return `${Number(key.slice(5, 7))}월 ${Number(key.slice(8))}일`;
}

const METRICS: { id: string; words: RegExp; label: string; pick: (r: KpiRow) => string; say: (r: KpiRow) => string }[] = [
  { id: 'gross', words: /총매출/, label: '총매출', pick: r => wonText(r.figures.gross), say: r => wonText(r.figures.gross, true) },
  { id: 'net', words: /순매출|(?<!총)매출/, label: '순매출', pick: r => wonText(r.figures.net), say: r => wonText(r.figures.net, true) },
  { id: 'achievement', words: /달성/, label: '달성율', pick: r => pct(r.rates.achievement), say: r => pctSay(r.rates.achievement) },
  { id: 'growth', words: /신장|전년|작년\s*대비/, label: '신장율', pick: r => pct(r.rates.growth, true), say: r => pctSay(r.rates.growth, true) },
  { id: 'profitRate', words: /이익/, label: '이익율', pick: r => pct(r.rates.profitRate), say: r => pctSay(r.rates.profitRate) },
  { id: 'totalDiscountRate', words: /총\s*할인|할인율(?!.*에누리)/, label: '총할인율', pick: r => pct(r.rates.totalDiscountRate), say: r => pctSay(r.rates.totalDiscountRate) },
  { id: 'wasteRate', words: /폐기/, label: '폐기율', pick: r => pct(r.rates.wasteRate), say: r => pctSay(r.rates.wasteRate) },
  { id: 'lossRate', words: /로스/, label: '로스율', pick: r => pct(r.rates.lossRate), say: r => pctSay(r.rates.lossRate) },
  { id: 'tastingRate', words: /시식/, label: '시식율', pick: r => pct(r.rates.tastingRate), say: r => pctSay(r.rates.tastingRate) },
  { id: 'markdownRate', words: /에누리/, label: '할인에누리율', pick: r => pct(r.rates.markdownRate), say: r => pctSay(r.rates.markdownRate) },
  { id: 'share', words: /구성비|비중/, label: '구성비', pick: r => pct(r.rates.share), say: r => pctSay(r.rates.share) },
];

/** 한 줄 보고서 (글자) */
function reportLines(r: KpiRow): string[] {
  const x = r.rates;
  return [
    `순매출 ${wonText(r.figures.net)}${r.figures.gross !== undefined && netFor(r.figures, 'gross') === r.figures.net ? ` (총매출 ${wonText(r.figures.gross)})` : ''}`,
    `달성율 ${pct(x.achievement)} · 신장율 ${pct(x.growth, true)} · 이익율 ${pct(x.profitRate)}`,
    `총할인율 ${pct(x.totalDiscountRate)} (폐기 ${pct(x.wasteRate)} · 로스 ${pct(x.lossRate)} · 시식 ${pct(x.tastingRate)} · 할인에누리 ${pct(x.markdownRate)})`,
    ...(r.dept !== '전체' ? [`구성비 ${pct(x.share)}`] : []),
  ];
}
function reportSpeech(r: KpiRow) {
  const x = r.rates;
  const parts = [`순매출 ${wonText(r.figures.net, true)}`];
  if (x.achievement !== null) parts.push(`달성율 ${pctSay(x.achievement)}`);
  if (x.growth !== null) parts.push(`신장율 ${pctSay(x.growth, true)}`);
  if (x.profitRate !== null) parts.push(`이익율 ${pctSay(x.profitRate)}`);
  if (x.totalDiscountRate !== null) parts.push(`총할인율 ${pctSay(x.totalDiscountRate)}`);
  if (x.lossRate !== null) parts.push(`로스율 ${pctSay(x.lossRate)}`);
  if (x.wasteRate !== null) parts.push(`폐기율 ${pctSay(x.wasteRate)}`);
  return parts.join(', ');
}

/** 질문에서 기간 찾기: 오늘·어제·이번 달·지난달·올해·작년·10월·10월 5일·3일 */
export function parseKpiPeriod(q: string, today: { year: number; month: number; date: number }): { period: KpiPeriod; key: string } {
  const { year, month, date } = today;
  const day = (y: number, m: number, d: number) => {
    const t = new Date(Date.UTC(y, m - 1, d));
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  };
  if (/그저께|그제/.test(q)) return { period: 'day', key: day(year, month, date - 2) };
  if (/어제/.test(q)) return { period: 'day', key: day(year, month, date - 1) };
  if (/오늘|금일/.test(q)) return { period: 'day', key: day(year, month, date) };
  if (/작년|전년도/.test(q) && !/대비/.test(q)) return { period: 'year', key: String(year - 1) };
  if (/올해|금년|연간|년간/.test(q)) return { period: 'year', key: String(year) };
  if (/지난\s*달|전월/.test(q)) { const t = new Date(Date.UTC(year, month - 2, 1)); return { period: 'month', key: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}` }; }
  const md = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(q);
  if (md) return { period: 'day', key: day(year, Number(md[1]), Number(md[2])) };
  const m = /(\d{1,2})\s*월/.exec(q);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) return { period: 'month', key: `${Number(m[1]) > month ? year - 1 : year}-${pad(Number(m[1]))}` };
  const d = /(\d{1,2})\s*일/.exec(q);
  if (d) return { period: 'day', key: day(year, month, Number(d[1])) };
  return { period: 'month', key: `${year}-${pad(month)}` }; // 기본: 이번 달 누계
}

export interface KpiAnswer { title: string; text: string; speech: string; found: boolean }

/** 말로 물은 실적 질문에 글(보고서)과 말로 답한다 */
export function answerKpi(question: string, records: KpiRecord[], today: { year: number; month: number; date: number }): KpiAnswer {
  const q = question.replace(/\s+/g, ' ');
  const { period, key } = parseKpiPeriod(q, today);
  const dept = SALES_DEPTS.find(d => q.includes(d)) ?? (q.includes('생활') ? '생활문화' : undefined);
  const table = kpiTable(records, period, key);
  const label = periodLabel(period, key) + (period === 'month' && key === `${today.year}-${pad(today.month)}` ? ` (${today.month}/1~${today.month}/${today.date} 누계)` : '');
  const target = dept ?? '전체';
  const row = table.find(r => r.dept === target);
  const title = `📊 ${label} ${target} 실적`;
  if (!row) return { title, found: false, text: `${label} ${target} 실적이 아직 입력되지 않았습니다.`, speech: `${label.replace(/\(.*\)/, '')} ${target} 실적이 아직 입력되지 않았습니다.` };

  const asked = METRICS.filter(m => m.words.test(q) && !(m.id === 'net' && METRICS.some(o => o.id !== 'net' && o.id !== 'gross' && o.words.test(q))));
  const sayLabel = label.replace(/\(.*\)/, '').replace(`${today.year}년 `, '').trim();
  if (asked.length) {
    const text = [title, ...asked.map(m => `${m.label} ${m.pick(row)}`), '', ...reportLines(row)].join('\n');
    const speech = `${sayLabel} ${target} ${asked.map(m => `${m.label} ${m.say(row) || '자료 없음'}`).join(', ')}입니다.`;
    return { title, text, speech, found: true };
  }
  // 전체를 물으면 부서별 순위도 덧붙인다
  const ranking = target === '전체' ? table.filter(r => r.dept !== '전체').sort((a, b) => (b.figures.net ?? 0) - (a.figures.net ?? 0)) : [];
  const text = [
    title, ...reportLines(row),
    ...(ranking.length ? ['', '부서별 순매출 (구성비 · 달성율)', ...ranking.map((r, i) => `${i + 1}. ${r.dept} ${wonText(r.figures.net)} (${pct(r.rates.share)} · ${pct(r.rates.achievement)})`)] : []),
  ].join('\n');
  return { title, text, speech: `${sayLabel} ${target} 실적입니다. ${reportSpeech(row)}.`, found: true };
}
