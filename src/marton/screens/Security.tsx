import { useMemo, useState, type FormEvent } from 'react';
import { ShieldAlert, Siren, MapPin, Video, ChevronDown, Sparkles, Radio } from 'lucide-react';
import {
  INCIDENT_TYPES, INCIDENT_STATUSES, INCIDENT_OUTCOMES, SECURITY_ZONES, canHandleIncident, lossStats,
  type Incident, type IncidentOutcome, type IncidentStatus, type IncidentType, type LossInsight, type PatrolLog, type Product, type Staff, type WeeklyReport,
} from '../shared';
import { api } from '../api';
import { send } from '../outbox';
import { Chip, clock, cx, elapsed, Empty, inputCls, Section, won } from '../ui';
import { PatrolPlan, Reports } from './Patrol';

const STATUS_STYLE: Record<IncidentStatus, string> = {
  접수: 'bg-amber-100 text-amber-800',
  확인: 'bg-sky-100 text-sky-800',
  대응중: 'bg-violet-100 text-violet-800',
  종결: 'bg-slate-200 text-slate-700',
};
const NEXT_LABEL: Partial<Record<IncidentStatus, string>> = { 확인: '확인했어요', 대응중: '현장 대응 시작', 종결: '종결 처리' };
const AGO = [['지금', 0], ['10분 전', 10], ['30분 전', 30], ['1시간 전', 60]] as const;

function ReportForm({ products, onDone, onError }: { products: Product[]; onDone: (sent: boolean) => void; onError: (m: string) => void }) {
  const [type, setType] = useState<IncidentType | ''>('');
  const [urgent, setUrgent] = useState(false);
  const [zone, setZone] = useState('');
  const [ago, setAgo] = useState(0);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [cctvRef, setCctvRef] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const pickProduct = (name: string) => {
    setProductName(name);
    const p = products.find(x => x.name === name);
    if (p) {
      setUnitPrice(String(p.price));
      if (!zone) setZone(SECURITY_ZONES.find(z => z.dept === p.dept)?.zone ?? '');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const sent = await send<Incident>('/incidents', {
        type, urgent, zone, productName, quantity: Number(quantity), unitPrice: Number(unitPrice), cctvRef, note,
        occurredAt: Date.now() - ago * 60 * 1000,
      }, `보안 신고: ${type} · ${zone}`);
      setType(''); setUrgent(false); setProductName(''); setQuantity('1'); setUnitPrice(''); setCctvRef(''); setNote(''); setAgo(0);
      onDone(sent !== null);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-900">
        <b>직접 제지·추궁하지 마세요.</b> 상황만 기록하면 보안(MS)과 관리자에게 바로 전달됩니다. 인상착의나 추측은 적지 않습니다.
      </p>

      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">무슨 상황인가요?</span>
        <div className="flex flex-wrap gap-2">
          {INCIDENT_TYPES.filter(t => t !== '센서 경보').map(t => <Chip key={t} active={type === t} onClick={() => setType(t)}>{t}</Chip>)}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setUrgent(u => !u)}
        className={cx('flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3 text-[15px] font-bold',
          urgent ? 'border-red-600 bg-red-600 text-white' : 'border-red-200 bg-white text-red-600')}
      >
        <Siren className="size-5" />{urgent ? '지금 진행 중 — 보안 즉시 호출' : '지금 진행 중인 상황인가요?'}
      </button>

      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">위치</span>
        <div className="flex flex-wrap gap-2">
          {SECURITY_ZONES.map(z => <Chip key={z.zone} active={zone === z.zone} onClick={() => setZone(z.zone)}>{z.zone}</Chip>)}
        </div>
        <input className={inputCls} value={zone} onChange={e => setZone(e.target.value)} placeholder="직접 입력 (예: 7번 통로 엔드)" maxLength={40} />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">발생 시각</span>
        <div className="flex flex-wrap gap-2">
          {AGO.map(([label, m]) => <Chip key={label} active={ago === m} onClick={() => setAgo(m)}>{label}</Chip>)}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">관련 상품 (선택)</span>
        <input className={inputCls} list="marton-products" value={productName} onChange={e => pickProduct(e.target.value)} placeholder="상품명" maxLength={60} />
        <datalist id="marton-products">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} inputMode="numeric" value={quantity} onChange={e => setQuantity(e.target.value.replace(/\D/g, ''))} placeholder="수량" />
          <input className={inputCls} inputMode="numeric" value={unitPrice} onChange={e => setUnitPrice(e.target.value.replace(/\D/g, ''))} placeholder="단가(원)" />
        </div>
      </div>

      <input className={inputCls} value={cctvRef} onChange={e => setCctvRef(e.target.value)} placeholder="CCTV 참고 (예: CAM-12 14:32~14:35)" maxLength={60} />
      <textarea className={cx(inputCls, 'min-h-20')} value={note} onChange={e => setNote(e.target.value)} placeholder="상황 (예: 포장이 뜯긴 채 진열대 뒤에서 발견)" maxLength={500} />

      <button className="w-full rounded-xl bg-slate-900 py-3.5 text-[15px] font-bold text-white disabled:opacity-50" disabled={busy || !type || !zone}>
        {busy ? '보내는 중…' : '보안 신고 보내기'}
      </button>
    </form>
  );
}

export function IncidentCard({ incident: i, me, onError }: { incident: Incident; me: Staff; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [outcome, setOutcome] = useState<IncidentOutcome | ''>('');
  const [qty, setQty] = useState(String(i.quantity ?? 1));
  const [price, setPrice] = useState(String(i.unitPrice ?? ''));
  const [busy, setBusy] = useState(false);
  const idx = INCIDENT_STATUSES.indexOf(i.status);
  const next = idx < INCIDENT_STATUSES.length - 1 ? INCIDENT_STATUSES[idx + 1] : null;
  const canAct = next && canHandleIncident(me);

  const advance = async (status: IncidentStatus, extra: object = {}) => {
    setBusy(true);
    try { await send(`/incidents/${i.id}/status`, { status, ...extra }, `보안 ${i.zone} → ${status}`); setClosing(false); }
    catch (e) { onError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <article className={cx('rounded-2xl border bg-white p-4 shadow-sm', i.urgent && i.status !== '종결' ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200')}>
      <button type="button" className="w-full text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {i.urgent && i.status !== '종결' && <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 font-bold text-white"><Siren className="size-3" />진행중</span>}
          {i.source === 'sensor' && <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-1.5 py-0.5 font-bold text-white"><Radio className="size-3" />{i.sensorId}</span>}
          {i.test && <span className="rounded-md bg-slate-200 px-1.5 py-0.5 font-bold text-slate-600">테스트</span>}
          <span className={cx('rounded-md px-1.5 py-0.5 font-bold', STATUS_STYLE[i.status])}>{i.status}{i.outcome ? ` · ${i.outcome}` : ''}</span>
          <span className="ml-auto text-slate-400">{elapsed(i.occurredAt)} 전</span>
        </div>
        <h3 className="mt-2 text-[16px] font-bold text-slate-900">{i.type}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-slate-600">
          <span className="inline-flex items-center gap-0.5 font-semibold"><MapPin className="size-3.5" />{i.zone}</span>
          {i.productName && <span>{i.productName}{i.quantity ? ` ×${i.quantity}` : ''}</span>}
          {i.estimatedLoss > 0 && <span className="font-semibold text-slate-800">{won(i.estimatedLoss)}</span>}
          <ChevronDown className={cx('ml-auto size-4 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
          {i.note && <p className="whitespace-pre-wrap text-slate-700">{i.note}</p>}
          {i.cctvRef && <p className="flex items-center gap-1 text-slate-600"><Video className="size-4" />{i.cctvRef}</p>}
          <p className="text-xs text-slate-500">발생 {new Date(i.occurredAt).toLocaleString('ko-KR')} · 신고 {i.reportedBy.dept} {i.reportedBy.name}</p>
          <ol className="space-y-1.5">
            {i.history.map((h, k) => (
              <li key={k} className="flex items-center gap-2 text-[13px]">
                <span className={cx('w-12 rounded-md px-1.5 py-0.5 text-center text-xs font-bold', STATUS_STYLE[h.status])}>{h.status}</span>
                <span className="text-slate-700">{h.by.dept} {h.by.name}</span>
                {h.note && <span className="text-slate-500">· {h.note}</span>}
                <span className="ml-auto text-slate-400">{clock(h.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {canAct && !closing && (
        <button
          type="button"
          disabled={busy}
          onClick={() => (next === '종결' ? setClosing(true) : advance(next!))}
          className={cx('mt-3 w-full rounded-xl py-3 text-[15px] font-bold text-white disabled:opacity-50', next === '종결' ? 'bg-slate-800' : i.urgent ? 'bg-red-600' : 'bg-blue-600')}
        >
          {NEXT_LABEL[next!]}
        </button>
      )}

      {closing && (
        <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
          <div className="flex flex-wrap gap-2">
            {INCIDENT_OUTCOMES.map(o => <Chip key={o} active={outcome === o} onClick={() => setOutcome(o)}>{o}</Chip>)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} inputMode="numeric" value={qty} onChange={e => setQty(e.target.value.replace(/\D/g, ''))} placeholder="손실 수량" />
            <input className={inputCls} inputMode="numeric" value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} placeholder="단가(원)" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setClosing(false)} className="rounded-xl bg-white py-3 text-sm font-bold text-slate-600">취소</button>
            <button type="button" disabled={!outcome || busy} onClick={() => advance('종결', { outcome, quantity: Number(qty), unitPrice: Number(price) })} className="rounded-xl bg-slate-800 py-3 text-sm font-bold text-white disabled:opacity-50">종결</button>
          </div>
        </div>
      )}
    </article>
  );
}

function HBars({ rows, format = (n: number) => `${n}건` }: { rows: [string, number][]; format?: (n: number) => string }) {
  if (!rows.length) return <p className="text-sm text-slate-400">데이터 없음</p>;
  const max = Math.max(...rows.map(r => r[1]));
  return (
    <div className="space-y-2">
      {rows.map(([label, n]) => (
        <div key={label} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-2 text-[13px]" title={`${label}: ${format(n)}`}>
          <span className="truncate text-slate-700">{label}</span>
          <div className="h-3"><div className="h-full rounded-r bg-blue-600" style={{ width: `${Math.max(4, (n / max) * 100)}%` }} /></div>
          <span className="font-semibold text-slate-800">{format(n)}</span>
        </div>
      ))}
    </div>
  );
}

function ColumnBars({ values, labels, every = 1, unit = '' }: { values: number[]; labels: string[]; every?: number; unit?: string }) {
  const max = Math.max(1, ...values);
  const peak = values.indexOf(Math.max(...values));
  return (
    <div>
      <div className="flex h-28 items-end gap-0.5 border-b border-slate-200">
        {values.map((v, k) => (
          <div key={k} className="group relative flex h-full flex-1 items-end" title={`${labels[k]}${unit}: ${v}건`}>
            <div className={cx('w-full rounded-t', k === peak && v > 0 ? 'bg-blue-700' : 'bg-blue-400')} style={{ height: v ? `${Math.max(4, (v / max) * 100)}%` : 0 }} />
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[11px] text-white group-hover:block">{labels[k]}{unit} {v}건</span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5 text-[10px] text-slate-500">
        {labels.map((l, k) => <span key={k} className="flex-1 text-center">{k % every === 0 ? l : ''}</span>)}
      </div>
      {values[peak] > 0 && <p className="mt-1.5 text-xs text-slate-600">가장 많음: <b>{labels[peak]}{unit}</b> ({values[peak]}건)</p>}
    </div>
  );
}

function Analytics({ incidents, reports, onError, onToast }: { incidents: Incident[]; reports: WeeklyReport[]; onError: (m: string) => void; onToast: (m: string) => void }) {
  const [days, setDays] = useState(30);
  const [insight, setInsight] = useState<LossInsight | null>(null);
  const [busy, setBusy] = useState(false);
  const s = useMemo(() => lossStats(incidents, Date.now() - days * 86400000), [incidents, days]);

  const analyze = async () => {
    setBusy(true);
    try { setInsight(await api<LossInsight>('/ai/loss-insight', { days })); }
    catch (e) { onError((e as Error).message); }
    finally { setBusy(false); }
  };
  const testSensor = async () => {
    try { await api('/incidents/sensor-test', {}); onToast('테스트 센서 경보를 보냈습니다.'); }
    catch (e) { onError((e as Error).message); }
  };

  const closedCount = s.confirmed + s.falseAlarm;
  const tiles: [string, string][] = [
    ['신고', `${s.total}건`],
    ['손실 확인', `${s.confirmed}건`],
    ['추정 손실액', won(s.loss) === '-' ? '0원' : won(s.loss)],
    ['오인 비율', closedCount ? `${Math.round((s.falseAlarm / closedCount) * 100)}%` : '-'],
    ['평균 확인', s.avgAckMs === null ? '-' : elapsed(0, s.avgAckMs)],
    ['미종결', `${s.open}건`],
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[7, 30, 90].map(d => <Chip key={d} active={days === d} onClick={() => { setDays(d); setInsight(null); }}>최근 {d}일</Chip>)}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-3">
            <div className="text-[11px] font-semibold text-slate-500">{label}</div>
            <div className="mt-0.5 whitespace-nowrap text-[15px] font-black text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl bg-indigo-50 p-4">
        <button onClick={analyze} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50">
          <Sparkles className="size-4" />{busy ? '분석 중…' : '손실 패턴 분석 · 예방 조치 추천'}
        </button>
        {insight && (
          <div className="space-y-2 text-sm text-indigo-950">
            <p className="font-semibold">{insight.summary}</p>
            <ul className="list-disc space-y-1 pl-5">{insight.actions.map((a, k) => <li key={k}>{a}</li>)}</ul>
            <p className="text-[11px] text-indigo-500">{insight.source === 'ai' ? 'AI 분석' : '규칙 기반 분석 (AI 키 미설정 또는 데이터 부족)'}</p>
          </div>
        )}
      </div>

      <Reports reports={reports} onError={onError} onToast={onToast} />

      <Section title="구역별 신고"><div className="rounded-2xl bg-white p-4"><HBars rows={s.byZone.slice(0, 8)} /></div></Section>
      <Section title="시간대별 발생">
        <div className="rounded-2xl bg-white p-4"><ColumnBars values={s.byHour} labels={s.byHour.map((_, h) => String(h))} unit="시" every={3} /></div>
      </Section>
      <Section title="요일별 발생">
        <div className="rounded-2xl bg-white p-4"><ColumnBars values={s.byWeekday} labels={['일', '월', '화', '수', '목', '금', '토']} /></div>
      </Section>
      <Section title="상품별 손실액"><div className="rounded-2xl bg-white p-4"><HBars rows={s.byProduct.slice(0, 8)} format={won} /></div></Section>
      <Section title="유형별"><div className="rounded-2xl bg-white p-4"><HBars rows={s.byType} /></div></Section>

      <Section title="연동 점검">
        <div className="space-y-2 rounded-2xl bg-white p-4 text-[13px] text-slate-600">
          <p>CCTV 분석기, EAS 게이트, 진열대 센서는 <code className="rounded bg-slate-100 px-1">POST /api/marton/integrations/alerts</code> 로 경보를 보내면 보안·관리자·해당 구역 부서에 즉시 알림이 갑니다.</p>
          <button onClick={testSensor} className="w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-white">테스트 센서 경보 보내기</button>
        </div>
      </Section>
    </div>
  );
}

const GUIDE = [
  ['직접 제지·추궁·신체 접촉 금지', '확신이 있어도 직접 붙잡거나 소지품을 확인하지 않습니다. 보안(MS) 또는 관리자가 대응합니다.'],
  ['먼저 다가가 응대하기', '"찾으시는 상품 있으세요?" 하고 밝게 인사하는 것만으로도 대부분 예방됩니다.'],
  ['상황만 기록', '위치·시간·상품·CCTV 카메라 번호만 남기고, 인상착의나 추측은 앱에 쓰지 않습니다.'],
  ['영상은 CCTV 시스템에서', '개인 휴대폰으로 사람을 촬영하지 않습니다. 영상 확인은 권한 있는 담당자가 합니다.'],
  ['빈 포장·태그 발견 시', '발견 위치와 상품을 신고하고, 빈 포장은 보안 담당에게 전달합니다(손실 집계용).'],
  ['위험하면 물러서기', '흉기·폭력 우려가 있으면 고객과 직원 안전이 우선입니다. 즉시 관리자와 112에 연락합니다.'],
];

type Sub = 'report' | 'list' | 'patrol' | 'analytics' | 'guide';

export default function Security({ me, incidents, patrols, reports, products, onError, onToast }: {
  me: Staff; incidents: Incident[]; patrols: PatrolLog[]; reports: WeeklyReport[]; products: Product[]; onError: (m: string) => void; onToast: (m: string) => void;
}) {
  const handler = canHandleIncident(me);
  const [sub, setSub] = useState<Sub>(handler ? 'list' : 'report');
  const [showClosed, setShowClosed] = useState(false);

  const visible = handler ? incidents : incidents.filter(i => i.reportedBy.id === me.id || (i.dept === me.dept && i.status !== '종결'));
  const open = visible.filter(i => i.status !== '종결').sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.createdAt - a.createdAt);
  const closed = visible.filter(i => i.status === '종결').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30);

  const tabs: [Sub, string][] = [
    ['report', '신고'],
    ['list', `현황${open.length ? ` ${open.length}` : ''}`],
    ...(handler ? [['patrol', '순찰'] as [Sub, string]] : []),
    ...(me.role === 'manager' ? [['analytics', '분석'] as [Sub, string]] : []),
    ['guide', '수칙'],
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setSub(k)} className={cx('flex-1 rounded-lg py-2 text-sm font-semibold', sub === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600')}>{label}</button>
        ))}
      </div>

      {sub === 'report' && <ReportForm products={products} onError={onError} onDone={sent => { if (sent) onToast('보안 신고를 보냈습니다.'); setSub('list'); }} />}

      {sub === 'list' && (
        <div className="space-y-3">
          {open.length ? open.map(i => <IncidentCard key={i.id} incident={i} me={me} onError={onError} />) : <Empty>진행 중인 보안 신고가 없습니다.</Empty>}
          {closed.length > 0 && (
            <>
              <button onClick={() => setShowClosed(s => !s)} className="text-sm font-semibold text-slate-500">종결 {closed.length}건 {showClosed ? '접기' : '보기'}</button>
              {showClosed && closed.map(i => <IncidentCard key={i.id} incident={i} me={me} onError={onError} />)}
            </>
          )}
        </div>
      )}

      {sub === 'patrol' && handler && <PatrolPlan incidents={incidents} patrols={patrols} onError={onError} />}
      {sub === 'analytics' && me.role === 'manager' && <Analytics incidents={incidents} reports={reports} onError={onError} onToast={onToast} />}

      {sub === 'guide' && (
        <div className="space-y-2">
          {GUIDE.map(([title, body]) => (
            <div key={title} className="rounded-2xl bg-white p-4">
              <div className="flex items-center gap-2 font-bold text-slate-900"><ShieldAlert className="size-4 text-red-600" />{title}</div>
              <p className="mt-1 text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
