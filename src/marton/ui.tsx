import type { ReactNode } from 'react';
import type { Task, TaskCategory, Department } from './shared';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function elapsed(from: number, to = Date.now()) {
  const s = Math.max(0, Math.round((to - from) / 1000));
  if (s < 60) return `${s}초`;
  if (s < 3600) return `${Math.floor(s / 60)}분`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분`;
  return `${Math.floor(s / 86400)}일`;
}

export const clock = (t: number) => new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
export const won = (n?: number) => (n ? `${n.toLocaleString()}원` : '-');

export function Chip({ active, onClick, children, tone = 'blue' }: { active?: boolean; onClick?: () => void; children: ReactNode; tone?: 'blue' | 'red' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors',
        active
          ? tone === 'red' ? 'bg-red-600 border-red-600 text-white' : 'bg-blue-600 border-blue-600 text-white'
          : 'bg-white border-slate-200 text-slate-700 active:bg-slate-100',
      )}
    >
      {children}
    </button>
  );
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">{children}</div>;
}

export const STATUS_STYLE: Record<Task['status'], string> = {
  접수: 'bg-amber-100 text-amber-800',
  확인: 'bg-sky-100 text-sky-800',
  처리중: 'bg-violet-100 text-violet-800',
  완료: 'bg-emerald-100 text-emerald-800',
};

export interface Draft {
  toDept?: Department;
  category?: TaskCategory;
  title?: string;
  detail?: string;
  location?: string;
  urgent?: boolean;
  photos?: string[]; // 첨부할 사진 (data URL)
}

export const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
export const primaryBtn = 'w-full rounded-xl bg-blue-600 py-3.5 text-[15px] font-bold text-white active:bg-blue-700 disabled:opacity-50';
