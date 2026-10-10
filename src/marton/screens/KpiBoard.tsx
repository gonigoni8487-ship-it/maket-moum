import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ImagePlus, Lock, Mic, MicOff, Save, Volume2 } from 'lucide-react';
import {
  FIGURE_FIELDS, PERIOD_LABEL, SALES_DEPTS, answerKpi, kpiRates, kpiTable, kpiTrend, pct, periodLabel, wonText,
  type KpiAnswer, type KpiFigures, type KpiPeriod, type KpiRecord, type KpiRow, type SalesDept,
} from '../kpi';
import { storeTime, type Staff } from '../shared';
import { api } from '../api';
import { speak, primeSpeech } from '../alerts';
import { fileToJpeg } from '../camera';
import { useDictation } from '../dictation';
import { Chip, cx, Empty, Examples, inputCls } from '../ui';
import CameraView from './CameraView';

type Sub = 'ask' | 'stats' | 'input' | 'access';
const pad = (n: number) => String(n).padStart(2, '0');
const todayParts = () => storeTime(Date.now());
const defaultKey = (p: KpiPeriod) => { const t = todayParts(); return p === 'day' ? `${t.year}-${pad(t.month)}-${pad(t.date)}` : p === 'month' ? `${t.year}-${pad(t.month)}` : String(t.year); };

function PeriodPicker({ period, setPeriod, value, setValue }: { period: KpiPeriod; setPeriod: (p: KpiPeriod) => void; value: string; setValue: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1">
        {(['day', 'month', 'year'] as const).map(p => (
          <button key={p} type="button" onClick={() => { setPeriod(p); setValue(defaultKey(p)); }} aria-pressed={period === p}
            className={cx('rounded-lg px-3 py-1.5 text-sm font-bold', period === p ? 'bg-white shadow-sm' : 'text-slate-600')}>{PERIOD_LABEL[p]}</button>
        ))}
      </div>
      {period === 'day' && <input type="date" aria-label="날짜" className={cx(inputCls, 'min-w-0 py-2')} value={value} onChange={e => setValue(e.target.value)} />}
      {period === 'month' && <input type="month" aria-label="월" className={cx(inputCls, 'min-w-0 py-2')} value={value} onChange={e => setValue(e.target.value)} />}
      {period === 'year' && (
        <select aria-label="년" className={cx(inputCls, 'min-w-0 py-2')} value={value} onChange={e => setValue(e.target.value)}>
          {Array.from({ length: 6 }, (_, i) => String(todayParts().year - i)).map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
      )}
    </div>
  );
}

// ---- 물어보기: 말하거나 적으면 보고서 글 + 음성 ----
const ASK_EXAMPLES = ['이번 달 수산 로스율 얼마야?', '어제 전체 실적 알려줘', '9월 축산 달성율이랑 신장율', '올해 농산 이익율', '오늘 부서별 구성비'];
function Ask({ records }: { records: KpiRecord[] }) {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<KpiAnswer | null>(null);
  const ask = (text = q) => {
    if (!text.trim()) return;
    const t = todayParts();
    const a = answerKpi(text, records, { year: t.year, month: t.month, date: t.date });
    setAnswer(a);
    speak(a.speech);
  };
  const dictation = useDictation(text => { setQ(text); dictation.stop(); ask(text); });
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => { primeSpeech(); if (dictation.listening) dictation.stop(); else dictation.start(); }}
        className={cx('flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-black text-white', dictation.listening ? 'bg-red-600 motion-safe:animate-pulse' : 'bg-indigo-600 active:bg-indigo-700')}>
        {dictation.listening ? <><MicOff className="size-5" />듣고 있어요… 끝나면 눌러 주세요</> : <><Mic className="size-5" />🔊 말로 실적 물어보기</>}
      </button>
      {dictation.interim && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{dictation.interim}</p>}
      {dictation.problem && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{dictation.problem}</p>}
      <form onSubmit={e => { e.preventDefault(); primeSpeech(); ask(); }} className="flex gap-2">
        <input className={inputCls} value={q} onChange={e => setQ(e.target.value)} placeholder="글로 물어보기 (예: 이번 달 수산 로스율)" />
        <button className="shrink-0 rounded-xl bg-slate-800 px-4 text-sm font-bold text-white">묻기</button>
      </form>
      <Examples title="예시) 기간 · 부서 · 지표를 말해 보세요" items={ASK_EXAMPLES} onPick={x => { primeSpeech(); setQ(x); ask(x); }} />
      {answer && (
        <article className={cx('space-y-2 rounded-2xl border bg-white p-4', answer.found ? 'border-indigo-200' : 'border-amber-200')}>
          <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-slate-800">{answer.text}</pre>
          <button onClick={() => speak(answer.speech)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700"><Volume2 className="size-4" />다시 듣기</button>
        </article>
      )}
    </div>
  );
}

// ---- 통계: 일·월·년 부서별 표 + 추이 ----
function Stats({ records }: { records: KpiRecord[] }) {
  const [period, setPeriod] = useState<KpiPeriod>('month');
  const [key, setKey] = useState(defaultKey('month'));
  const [open, setOpen] = useState<string | null>(null);
  const table = useMemo(() => kpiTable(records, period, key), [records, period, key]);
  const trend = useMemo(() => kpiTrend(records, period, key), [records, period, key]);
  const maxNet = Math.max(1, ...trend.map(t => t.row.figures.net ?? 0));
  const cols: [string, (r: KpiRow) => string][] = [
    ['순매출', r => wonText(r.figures.net)], ['달성율', r => pct(r.rates.achievement)], ['신장율', r => pct(r.rates.growth, true)],
    ['이익율', r => pct(r.rates.profitRate)], ['총할인율', r => pct(r.rates.totalDiscountRate)], ['로스율', r => pct(r.rates.lossRate)],
    ['폐기율', r => pct(r.rates.wasteRate)], ['구성비', r => pct(r.rates.share)],
  ];
  return (
    <div className="space-y-3">
      <PeriodPicker period={period} setPeriod={setPeriod} value={key} setValue={setKey} />
      <p className="text-xs text-slate-500">{periodLabel(period, key)} · {period === 'day' ? '그날 입력값' : period === 'month' ? '월 입력값이 없으면 일 실적 합계' : '년 입력값이 없으면 월 실적 합계'}</p>
      {!table.length ? <Empty>{periodLabel(period, key)} 실적이 아직 없습니다. 「입력」에서 넣어 주세요.</Empty> : (<>
        <p className="-mb-1 text-right text-[11px] text-slate-400">표를 옆으로 밀면 더 보입니다 · 부서를 누르면 상세</p>
        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="w-full min-w-[640px] text-sm tabular-nums">
            <thead><tr className="border-b border-slate-100 text-xs text-slate-500">
              <th className="px-3 py-2 text-left">부서</th>{cols.map(([h]) => <th key={h} className="px-2 py-2 text-right">{h}</th>)}
            </tr></thead>
            <tbody>
              {table.map(r => (
                <tr key={r.dept} onClick={() => setOpen(o => (o === r.dept ? null : r.dept))} className={cx('cursor-pointer border-b border-slate-50', r.dept === '전체' && 'bg-slate-50 font-bold')}>
                  <td className="px-3 py-2.5 text-left font-bold">{r.dept}</td>
                  {cols.map(([h, f]) => <td key={h} className={cx('px-2 py-2.5 text-right', h === '신장율' && (r.rates.growth ?? 0) < 0 && 'text-red-600', h === '달성율' && (r.rates.achievement ?? 100) < 100 && 'text-amber-700')}>{f(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}
      {open && (() => {
        const r = table.find(x => x.dept === open);
        if (!r) return null;
        const f = r.figures;
        const items: [string, string][] = [
          ['총매출', wonText(f.gross)], ['순매출(실적)', wonText(f.net)], ['목표', wonText(f.target)], ['전년실적', wonText(f.lastYear)], ['이익액', wonText(f.profit)],
          ['원가영향액 (폐기+로스+시식)', wonText(r.rates.costImpact)], ['총할인금액 (원가영향액+할인에누리)', wonText(r.rates.totalDiscount)],
          ['시식율', pct(r.rates.tastingRate)], ['할인에누리율', pct(r.rates.markdownRate)],
        ];
        return (
          <div className="rounded-2xl bg-white p-4">
            <p className="mb-2 font-bold text-slate-900">{open} 상세</p>
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm tabular-nums">{items.map(([k, v]) => <Fragment key={k}><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold">{v}</dd></Fragment>)}</dl>
          </div>
        );
      })()}
      {trend.length > 0 && (
        <div className="space-y-1.5 rounded-2xl bg-white p-4">
          <p className="text-sm font-bold text-slate-800">{period === 'month' ? '날짜별' : '월별'} 전체 순매출 · 달성율</p>
          {trend.map(t => (
            <div key={t.key} className="grid grid-cols-[3rem_1fr_auto] items-center gap-2 text-xs tabular-nums">
              <span className="text-slate-500">{t.label}</span>
              <span className="h-3 overflow-hidden rounded bg-slate-100"><span className="block h-full rounded bg-indigo-500" style={{ width: `${((t.row.figures.net ?? 0) / maxNet) * 100}%` }} /></span>
              <span className="w-32 text-right">{wonText(t.row.figures.net)} · {pct(t.row.rates.achievement)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- 입력: 직접 또는 사진 자동 입력 ----
type Draft = Partial<Record<keyof KpiFigures | 'growth', string>>;
const toDraft = (f: KpiFigures): Draft => Object.fromEntries(FIGURE_FIELDS.filter(x => f[x.key] !== undefined).map(x => [x.key, String(f[x.key])]));
const fromDraft = (d: Draft) => Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, Number(String(v).replace(/[,\s원%+]/g, ''))]));
const comma = (v?: string) => { const n = Number(String(v ?? '').replace(/[,\s]/g, '')); return v && Number.isFinite(n) ? n.toLocaleString('ko-KR') : v ?? ''; };

function Input({ records, aiEnabled, onError, onToast }: { records: KpiRecord[]; aiEnabled: boolean; onError: (m: string) => void; onToast: (m: string) => void }) {
  const [period, setPeriod] = useState<KpiPeriod>('day');
  const [key, setKey] = useState(defaultKey('day'));
  const [dept, setDept] = useState<SalesDept>('수산');
  const [draft, setDraft] = useState<Draft>({});
  const [photoRows, setPhotoRows] = useState<{ dept: SalesDept; figures: KpiFigures }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const albumRef = useRef<HTMLInputElement>(null);
  const existing = records.find(r => r.period === period && r.key === key && r.dept === dept);
  useEffect(() => { setDraft(existing ? toDraft(existing.figures) : {}); }, [existing?.id, existing?.at, period, key, dept]); // eslint-disable-line react-hooks/exhaustive-deps
  const preview = kpiRates(fromDraft(draft) as KpiFigures);

  const save = async (list: { dept: SalesDept; figures: object }[], source: 'manual' | 'photo') => {
    setBusy(true);
    try {
      const r = await api<{ saved: number }>('/kpi', { records: list.map(x => ({ period, key, dept: x.dept, figures: x.figures, source })) });
      onToast(`${periodLabel(period, key)} 실적 ${r.saved}건을 저장했습니다.`);
      setPhotoRows(null);
    } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };
  const readPhoto = async (image: string) => {
    setBusy(true);
    try {
      const r = await api<{ period?: KpiPeriod; key?: string; rows: { dept: SalesDept; figures: KpiFigures }[] }>('/ai/kpi', { image });
      if (r.period && r.key) { setPeriod(r.period); setKey(r.key); }
      setPhotoRows(r.rows);
      onToast(`사진에서 ${r.rows.length}개 부서 실적을 읽었습니다. 확인 후 저장해 주세요.`);
    } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <PeriodPicker period={period} setPeriod={setPeriod} value={key} setValue={setKey} />

      <div className="space-y-2 rounded-2xl bg-white p-4">
        <p className="text-sm font-bold text-slate-800">📷 사진으로 자동 입력</p>
        <p className="text-xs text-slate-500">실적 일보·월보, POS 매출 화면을 찍으면 부서별 금액을 읽어 채웁니다.{!aiEnabled && ' (AI 키가 설정되어야 쓸 수 있습니다)'}</p>
        <div className="grid grid-cols-2 gap-2 text-sm font-bold">
          <button type="button" disabled={!aiEnabled || busy} onClick={() => setCamera(true)} className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-3 text-white disabled:opacity-40"><Camera className="size-4" />사진 찍기</button>
          <button type="button" disabled={!aiEnabled || busy} onClick={() => albumRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-indigo-200 py-3 text-indigo-700 disabled:opacity-40"><ImagePlus className="size-4" />앨범에서</button>
        </div>
        <input ref={albumRef} type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void readPhoto(await fileToJpeg(f, 2000)); }} />
        {busy && <p className="text-sm text-indigo-700">처리 중…</p>}
        {photoRows && (
          <div className="space-y-2 rounded-xl bg-indigo-50 p-3">
            <p className="text-sm font-bold text-indigo-900">{periodLabel(period, key)} · {photoRows.length}개 부서 (기간이 다르면 위에서 바꾼 뒤 저장)</p>
            {photoRows.map(r => (
              <p key={r.dept} className="text-xs leading-relaxed text-indigo-900"><b>{r.dept}</b> {FIGURE_FIELDS.filter(x => r.figures[x.key] !== undefined).map(x => `${x.label} ${wonText(r.figures[x.key])}`).join(' · ')}</p>
            ))}
            <div className="grid grid-cols-2 gap-2 text-sm font-bold">
              <button onClick={() => setPhotoRows(null)} className="rounded-lg bg-white py-2.5 text-slate-700">취소</button>
              <button onClick={() => save(photoRows, 'photo')} disabled={busy} className="rounded-lg bg-indigo-600 py-2.5 text-white">{photoRows.length}개 부서 저장</button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4">
        <p className="text-sm font-bold text-slate-800">✏️ 직접 입력 <span className="font-normal text-slate-400">(원 단위)</span></p>
        <div className="flex flex-wrap gap-2">{SALES_DEPTS.map(d => <Chip key={d} active={dept === d} onClick={() => setDept(d)}>{d}</Chip>)}</div>
        {existing && <p className="text-xs text-slate-500">이미 입력된 실적이 있습니다 ({existing.by.name}). 고쳐서 저장하면 바뀝니다.</p>}
        <div className="grid grid-cols-2 gap-2">
          {FIGURE_FIELDS.map(x => (
            <label key={x.key} className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">{x.label}</span>
              <input inputMode="numeric" className={cx(inputCls, 'py-2 text-right tabular-nums')} value={comma(draft[x.key])} onChange={e => setDraft({ ...draft, [x.key]: e.target.value.replace(/[^\d-]/g, '') })} placeholder="0" />
            </label>
          ))}
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-600">신장율(%) <span className="font-normal text-slate-400">전년실적 대신</span></span>
            <input inputMode="decimal" className={cx(inputCls, 'py-2 text-right')} value={draft.growth ?? ''} onChange={e => setDraft({ ...draft, growth: e.target.value })} placeholder="예: 3.5" disabled={Boolean(draft.lastYear)} />
          </label>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 tabular-nums">
          달성율 {pct(preview.achievement)} · 신장율 {pct(preview.growth, true)} · 이익율 {pct(preview.profitRate)} · 총할인율 {pct(preview.totalDiscountRate)}<br />
          폐기율 {pct(preview.wasteRate)} · 로스율 {pct(preview.lossRate)} · 시식율 {pct(preview.tastingRate)} · 할인에누리율 {pct(preview.markdownRate)}
        </div>
        <button onClick={() => save([{ dept, figures: fromDraft(draft) }], 'manual')} disabled={busy || !draft.net}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-3.5 font-bold text-white disabled:opacity-40"><Save className="size-4" />{dept} {periodLabel(period, key)} 저장</button>
        {!draft.net && <p className="text-center text-xs text-slate-400">순매출(실적)은 꼭 넣어 주세요.</p>}
      </div>
      {camera && <CameraView mode="photo" onClose={() => setCamera(false)} onCapture={p => { setCamera(false); void readPhoto(p); }} />}
    </div>
  );
}

// ---- 권한: 관리자가 시니어 담당에게 허락 ----
function Access({ onError, onToast }: { onError: (m: string) => void; onToast: (m: string) => void }) {
  const [list, setList] = useState<{ id: string; name: string; dept: string; rank?: string; level?: string; allowed: boolean }[] | null>(null);
  const load = () => api<typeof list>('/kpi/access').then(setList, e => onError((e as Error).message));
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = async (id: string, allow: boolean, name: string) => {
    try { await api('/kpi/access', { staffId: id, allow }); onToast(`${name}님 실적 지표 열람을 ${allow ? '허락' : '취소'}했습니다.`); void load(); }
    catch (e) { onError((e as Error).message); }
  };
  return (
    <div className="space-y-2">
      <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">점장·부점장은 항상 볼 수 있고, <b>시니어 담당</b>은 여기서 허락해야 볼 수 있습니다. 주니어 담당은 허락할 수 없습니다.</p>
      {!list ? <p className="text-sm text-slate-500">불러오는 중…</p> : !list.length ? <Empty>등록된 직원이 없습니다.</Empty> : list.map(s => (
        <div key={s.id} className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">{s.name} <span className="text-sm font-normal text-slate-500">{s.rank ?? ''}</span></p>
            <p className="text-xs text-slate-500">{s.dept} · {s.level ? `${s.level} 담당` : '담당 구분 없음'}</p>
          </div>
          {s.level === '시니어'
            ? <button onClick={() => toggle(s.id, !s.allowed, s.name)} aria-pressed={s.allowed} className={cx('rounded-lg px-3 py-2 text-sm font-bold', s.allowed ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700')}>{s.allowed ? '허락됨' : '허락하기'}</button>
            : <span className="text-xs text-slate-400">열람 불가</span>}
        </div>
      ))}
    </div>
  );
}

/** 실적 지표 (영업기밀): 관리자·승인된 시니어만 */
export default function KpiBoard({ me, records, aiEnabled, onError, onToast }: {
  me: Staff; records: KpiRecord[] | null; aiEnabled: boolean; onError: (m: string) => void; onToast: (m: string) => void;
}) {
  const [sub, setSub] = useState<Sub>('ask');
  const tabs: [Sub, string][] = [['ask', '🎤 물어보기'], ['stats', '📈 통계'], ['input', '✏️ 입력'], ...(me.role === 'manager' ? [['access', '👥 권한'] as [Sub, string]] : [])];
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"><Lock className="size-3.5" />영업기밀 — 화면 캡처·외부 공유 금지 · 점장·부점장, 승인된 시니어 담당만 볼 수 있습니다</p>
      <div className={cx('grid gap-1 rounded-xl bg-slate-200/70 p-1', tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
        {tabs.map(([k, label]) => <button key={k} onClick={() => setSub(k)} className={cx('rounded-lg py-2 text-sm font-semibold', sub === k ? 'bg-white shadow-sm' : 'text-slate-600')}>{label}</button>)}
      </div>
      {!records ? <p className="text-sm text-slate-500">실적을 불러오는 중…</p> : (
        <>
          {sub === 'ask' && <Ask records={records} />}
          {sub === 'stats' && <Stats records={records} />}
          {sub === 'input' && <Input records={records} aiEnabled={aiEnabled} onError={onError} onToast={onToast} />}
        </>
      )}
      {sub === 'access' && me.role === 'manager' && <Access onError={onError} onToast={onToast} />}
    </div>
  );
}

