import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, Camera, X } from 'lucide-react';
import { regularHolidays, storeTime, type ShiftEntry, type Staff, type WorkSchedule } from '../shared';
import { api } from '../api';
import { fileToJpeg } from '../camera';
import { downloadCsv, parseSchedule, readRows, scheduleTemplate } from '../sheets';
import { cx, Empty } from '../ui';

const SHIFT_STYLE: Record<string, string> = {
  '1근': 'bg-sky-100 text-sky-800', '2근': 'bg-emerald-100 text-emerald-800', '3근': 'bg-violet-100 text-violet-800',
  휴무: 'bg-slate-100 text-slate-500', 연차: 'bg-amber-100 text-amber-800', 반차: 'bg-orange-100 text-orange-800',
};
const WORK = ['1근', '2근', '3근'];
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');
const monthKey = (y: number, m: number) => `${y}-${pad(m)}`;
const shiftAt = (y: number, m: number, d: number) => `${monthKey(y, m)}-${pad(d)}`;

/** 점장·부점장: 근무계획 파일(엑셀·CSV) 또는 사진 올리기 → 미리보기 → 저장 */
function Uploader({ month, aiEnabled, onError, onToast }: { month: string; aiEnabled: boolean; onError: (m: string) => void; onToast: (m: string) => void }) {
  const [preview, setPreview] = useState<{ entries: ShiftEntry[]; fileName: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const fromFile = async (f?: File) => {
    if (!f) return;
    try {
      const entries = parseSchedule(await readRows(f), month);
      if (!entries.length) return onError(`${month.replace('-', '년 ')}월 근무를 찾지 못했습니다. 이름 칸과 1~31일 칸이 있는지, 월이 맞는지 확인해 주세요. (양식 받기 참고)`);
      setPreview({ entries, fileName: f.name });
    } catch (e) { onError((e as Error).message); }
  };
  const fromPhoto = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      const r = await api<{ entries: ShiftEntry[] }>('/ai/schedule', { month, image: await fileToJpeg(f, 2000) });
      if (!r.entries.length) onError('사진에서 근무를 읽지 못했습니다. 엑셀이나 CSV로 올려 주세요.');
      else setPreview({ entries: r.entries, fileName: f.name });
    } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const r = await api<{ people: number; entries: number }>('/schedules', { month, ...preview });
      onToast(`${month.replace('-', '년 ')}월 근무계획을 올렸습니다 (${r.people}명).`);
      setPreview(null);
    } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };

  const people = preview ? new Set(preview.entries.map(e => e.name)).size : 0;
  const counts = preview ? WORK.map(s => `${s} ${preview.entries.filter(e => e.shift === s).length}`).join(' · ') : '';

  return (
    <div className="space-y-2 rounded-2xl bg-white p-3">
      <div className="grid grid-cols-3 gap-2 text-xs font-bold">
        <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-1 rounded-xl bg-blue-600 py-2.5 text-white"><FileSpreadsheet className="size-5" />엑셀·CSV 올리기</button>
        <button onClick={() => (aiEnabled ? photoRef.current?.click() : onError('AI 키가 없어 사진 근무표는 읽을 수 없습니다. 엑셀이나 CSV로 올려 주세요.'))} className={cx('flex flex-col items-center gap-1 rounded-xl py-2.5', aiEnabled ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400')}><Camera className="size-5" />사진 올리기</button>
        <button onClick={() => downloadCsv(`근무계획_양식_${month}.csv`, scheduleTemplate(month))} className="flex flex-col items-center gap-1 rounded-xl bg-slate-100 py-2.5 text-slate-700"><Download className="size-5" />양식 받기</button>
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" hidden onChange={e => { void fromFile(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={photoRef} type="file" accept="image/*" hidden onChange={e => { void fromPhoto(e.target.files?.[0]); e.target.value = ''; }} />
      {busy && !preview && <p className="text-center text-xs text-slate-500">근무표를 읽는 중…</p>}
      {preview && (
        <div className="space-y-2 rounded-xl bg-blue-50 p-3 text-sm">
          <p className="font-bold text-blue-900">{preview.fileName} — {people}명, {counts}</p>
          <p className="text-xs text-blue-800">{[...new Set(preview.entries.map(e => e.name))].slice(0, 12).join(', ')}{people > 12 ? ` 외 ${people - 12}명` : ''}</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPreview(null)} className="rounded-lg bg-white py-2 font-bold text-slate-700">취소</button>
            <button onClick={save} disabled={busy} className="rounded-lg bg-blue-600 py-2 font-bold text-white disabled:opacity-50">{month.slice(5)}월 근무로 저장</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 월 근무 캘린더: 일별 1근·2근·3근 인원, 정기휴무(둘째·넷째 월요일), 내 근무 */
export default function ScheduleCalendar({ schedules, me, aiEnabled, onError, onToast }: {
  schedules: WorkSchedule[]; me: Staff; aiEnabled: boolean; onError: (m: string) => void; onToast: (m: string) => void;
}) {
  const now = storeTime(Date.now());
  const [ym, setYm] = useState({ y: now.year, m: now.month });
  const [day, setDay] = useState<number | null>(now.month === ym.m ? now.date : null);
  const key = monthKey(ym.y, ym.m);
  const schedule = schedules.find(s => s.month === key);
  const holidays = useMemo(() => new Set(regularHolidays(ym.y, ym.m)), [ym]);
  const byDate = useMemo(() => {
    const map = new Map<string, ShiftEntry[]>();
    schedule?.entries.forEach(e => map.set(e.date, [...(map.get(e.date) ?? []), e]));
    return map;
  }, [schedule]);
  const days = new Date(Date.UTC(ym.y, ym.m, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(ym.y, ym.m - 1, 1)).getUTCDay();
  const move = (d: number) => { const m = ym.m + d; setYm(m < 1 ? { y: ym.y - 1, m: 12 } : m > 12 ? { y: ym.y + 1, m: 1 } : { y: ym.y, m }); setDay(null); };
  const isToday = (d: number) => ym.y === now.year && ym.m === now.month && d === now.date;
  const dayEntries = day ? byDate.get(shiftAt(ym.y, ym.m, day)) ?? [] : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => move(-1)} aria-label="이전 달" className="rounded-lg bg-white p-2"><ChevronLeft className="size-5" /></button>
        <h3 className="text-lg font-black">{ym.y}년 {ym.m}월 근무</h3>
        <button onClick={() => move(1)} aria-label="다음 달" className="rounded-lg bg-white p-2"><ChevronRight className="size-5" /></button>
      </div>
      {me.role === 'manager' && <Uploader month={key} aiEnabled={aiEnabled} onError={onError} onToast={onToast} />}

      <div className="overflow-hidden rounded-2xl bg-white">
        <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-bold">
          {WEEK.map((w, i) => <div key={w} className={cx('py-2', i === 0 && 'text-red-500', i === 6 && 'text-blue-500')}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} className="min-h-20 border-b border-r border-slate-50" />)}
          {Array.from({ length: days }, (_, i) => i + 1).map(d => {
            const date = shiftAt(ym.y, ym.m, d);
            const list = byDate.get(date) ?? [];
            const holiday = holidays.has(date);
            const mine = list.find(e => e.name === me.name);
            const dow = (firstDow + d - 1) % 7;
            return (
              <button key={d} onClick={() => setDay(d)} aria-label={`${ym.m}월 ${d}일${holiday ? ' 정기휴무' : ''}`}
                className={cx('flex min-h-20 flex-col items-stretch gap-0.5 border-b border-r border-slate-50 p-1 text-left', holiday && 'bg-red-50', day === d && 'ring-2 ring-inset ring-blue-500')}>
                <span className={cx('self-start rounded-full px-1.5 text-xs font-bold', isToday(d) ? 'bg-blue-600 text-white' : dow === 0 || holiday ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-slate-700')}>{d}</span>
                {holiday && <span className="rounded bg-red-500 px-0.5 text-center text-[9px] font-black leading-4 text-white">정기휴무</span>}
                {mine && <span className={cx('rounded px-0.5 text-center text-[10px] font-black leading-4', SHIFT_STYLE[mine.shift] ?? 'bg-slate-100')}>나 {mine.shift}</span>}
                {!holiday && WORK.map(s => {
                  const n = list.filter(e => e.shift === s).length;
                  return n ? <span key={s} className="text-[10px] leading-3.5 text-slate-500">{s} {n}</span> : null;
                })}
              </button>
            );
          })}
        </div>
      </div>

      {!schedule && <Empty>{ym.m}월 근무계획이 아직 없습니다.{me.role === 'manager' ? ' 위에서 엑셀·CSV로 올려 주세요.' : ''}</Empty>}
      {schedule && <p className="text-right text-xs text-slate-400">{schedule.fileName ?? '근무계획'} · {schedule.uploadedBy.name} 올림</p>}

      {day && (
        <div className="space-y-2 rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-black">{ym.m}월 {day}일 ({WEEK[(firstDow + day - 1) % 7]}) 근무</h4>
            <button onClick={() => setDay(null)} aria-label="닫기"><X className="size-5 text-slate-400" /></button>
          </div>
          {holidays.has(shiftAt(ym.y, ym.m, day)) && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">매장 정기휴무일 (둘째·넷째 월요일)</p>}
          {!dayEntries.length && !holidays.has(shiftAt(ym.y, ym.m, day)) && <p className="text-sm text-slate-500">등록된 근무가 없습니다.</p>}
          {[...WORK, '반차', '연차', '휴무'].map(s => {
            const list = dayEntries.filter(e => e.shift === s);
            if (!list.length) return null;
            return (
              <div key={s} className="flex items-start gap-2 text-sm">
                <span className={cx('w-12 shrink-0 rounded-md py-0.5 text-center text-xs font-black', SHIFT_STYLE[s])}>{s}</span>
                <span className="text-slate-800">{list.map(e => `${e.name}${e.dept ? `(${e.dept})` : ''}`).join(', ')}</span>
              </div>
            );
          })}
          {dayEntries.filter(e => !SHIFT_STYLE[e.shift]).length > 0 && (
            <p className="text-xs text-slate-500">기타: {dayEntries.filter(e => !SHIFT_STYLE[e.shift]).map(e => `${e.name} ${e.shift}`).join(', ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
