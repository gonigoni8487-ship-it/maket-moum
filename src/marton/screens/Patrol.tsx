import { useMemo, useState } from 'react';
import { Check, Footprints, Copy, Printer, FileText } from 'lucide-react';
import { dayKey, patrolPlan, type Incident, type PatrolLog, type WeeklyReport } from '../shared';
import { api } from '../api';
import { send } from '../outbox';
import { clock, cx, Empty, Section } from '../ui';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function PatrolPlan({ incidents, patrols, onError }: { incidents: Incident[]; patrols: PatrolLog[]; onError: (m: string) => void }) {
  const [busy, setBusy] = useState('');
  const plan = useMemo(() => patrolPlan(incidents), [incidents]);
  const today = dayKey(Date.now());
  const todayLogs = patrols.filter(p => p.date === today).sort((a, b) => b.at - a.at);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const done = async (hour: number, zone: string) => {
    setBusy(`${hour}|${zone}`);
    try { await send('/patrols', { hour, zone, at: Date.now() }, `순찰 완료: ${zone}`); } catch (e) { onError((e as Error).message); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        오늘({WEEKDAYS[new Date().getDay()]}) 순찰 추천 · 최근 4주 신고 기준 (같은 요일·실제 손실에 가중치)
      </p>
      {plan.length === 0 && <Empty>신고 데이터가 쌓이면 시간대·구역별 순찰을 추천합니다.</Empty>}
      {plan.map(slot => {
        const current = nowMin >= slot.hour * 60 - 30 && nowMin < slot.hour * 60 + 30;
        const past = nowMin >= slot.hour * 60 + 30;
        return (
          <div key={slot.hour} className={cx('rounded-2xl border bg-white p-4', current ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200', past && 'opacity-70')}>
            <div className="flex items-center gap-2">
              <Footprints className="size-4 text-blue-600" />
              <span className="font-black text-slate-900">{slot.label}</span>
              {current && <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">지금</span>}
            </div>
            <div className="mt-3 space-y-2">
              {slot.zones.map(z => {
                const log = todayLogs.find(l => l.hour === slot.hour && l.zone === z.zone);
                return (
                  <div key={z.zone} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800">{z.zone}</div>
                      <div className="text-xs text-slate-500">{z.reason}</div>
                    </div>
                    {log ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">
                        <Check className="size-3.5" />{clock(log.at)} {log.by.name}
                      </span>
                    ) : (
                      <button disabled={busy === `${slot.hour}|${z.zone}`} onClick={() => done(slot.hour, z.zone)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                        순찰 완료
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {todayLogs.length > 0 && (
        <Section title={`오늘 순찰 기록 ${todayLogs.length}회`}>
          <div className="divide-y divide-slate-100 rounded-2xl bg-white">
            {todayLogs.map(l => (
              <div key={l.id} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="font-semibold">{l.zone}</span>
                <span className="text-slate-500">{l.by.name} · {clock(l.at)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function printReport(text: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  const pre = w.document.createElement('pre');
  pre.textContent = text;
  pre.style.cssText = 'font: 14px/1.7 system-ui, sans-serif; white-space: pre-wrap; padding: 24px;';
  w.document.title = '마트ON 주간 손실방지 리포트';
  w.document.body.appendChild(pre);
  w.print();
}

export function Reports({ reports, onError, onToast }: { reports: WeeklyReport[]; onError: (m: string) => void; onToast: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const sorted = [...reports].sort((a, b) => b.createdAt - a.createdAt);

  const generate = async (week: 'current' | 'last') => {
    setBusy(true);
    try {
      const r = await api<WeeklyReport>('/reports', { week });
      setOpenId(r.id);
    } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); onToast('리포트를 복사했습니다. 메신저·메일에 붙여 넣으세요.'); }
    catch { onError('복사할 수 없습니다. 길게 눌러 직접 선택해 주세요.'); }
  };

  return (
    <Section title="주간 손실방지 리포트" right={<span className="text-xs text-slate-400">매주 월요일 08시 자동 생성</span>}>
      <div className="grid grid-cols-2 gap-2">
        <button disabled={busy} onClick={() => generate('current')} className="rounded-xl bg-white py-3 text-sm font-bold text-slate-800 disabled:opacity-50">이번 주 (진행분)</button>
        <button disabled={busy} onClick={() => generate('last')} className="rounded-xl bg-white py-3 text-sm font-bold text-slate-800 disabled:opacity-50">지난주</button>
      </div>
      {sorted.length === 0 && <Empty>아직 생성된 리포트가 없습니다.</Empty>}
      {sorted.map(r => (
        <div key={r.id} className="rounded-2xl bg-white p-4">
          <button className="flex w-full items-center gap-2 text-left" onClick={() => setOpenId(id => (id === r.id ? null : r.id))}>
            <FileText className="size-4 text-slate-500" />
            <span className="flex-1 text-sm font-bold text-slate-900">{r.text.split('\n')[0].replace('[마트ON 주간 손실방지 리포트] ', '')}</span>
            <span className="text-[11px] text-slate-400">{r.auto ? '자동' : '수동'} · {new Date(r.createdAt).toLocaleDateString('ko-KR')}</span>
          </button>
          {openId === r.id && (
            <>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-[13px] leading-relaxed text-slate-800">{r.text}</pre>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => copy(r.text)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white"><Copy className="size-4" />복사</button>
                <button onClick={() => printReport(r.text)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-800"><Printer className="size-4" />인쇄/PDF</button>
              </div>
            </>
          )}
        </div>
      ))}
    </Section>
  );
}
