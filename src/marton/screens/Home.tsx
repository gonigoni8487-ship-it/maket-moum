import type { ReactNode } from 'react';
import {
  CalendarDays, Camera, ClipboardList, Coffee, HeartHandshake, LayoutDashboard, Megaphone, Mic, Search, Send, Settings, ShieldAlert, Siren, TimerReset, TrendingUp,
} from 'lucide-react';
import { EMERGENCY_INFO, regularHolidays, storeTime, type Emergency, type Staff, type WorkSchedule } from '../shared';
import { cx } from '../ui';

export type HomeGo =
  | 'tasks' | 'request' | 'find' | 'photo' | 'complaint' | 'security' | 'manager'
  | 'notice' | 'share' | 'schedule' | 'expiry' | 'voice' | 'wallet' | 'settings';

interface Counts { tasks: number; notices: number; share: number; expiry: number; complaints: number; incidents: number; coupons: number }

const pad = (n: number) => String(n).padStart(2, '0');

function Tile({ icon, label, hint, color, badge, onClick, big }: { icon: ReactNode; label: string; hint?: string; color: string; badge?: number; onClick: () => void; big?: boolean }) {
  return (
    <button onClick={onClick} className={cx('relative flex flex-col items-start gap-2 rounded-2xl bg-white text-left shadow-sm active:bg-slate-50', big ? 'p-4' : 'p-3.5')}>
      <span className={cx('grid shrink-0 place-items-center rounded-xl text-white', big ? 'size-12' : 'size-10', color)}>{icon}</span>
      <span className="min-w-0 [word-break:keep-all]">
        <span className={cx('block font-bold text-slate-900', big ? 'text-[16px]' : 'text-[15px]')}>{label}</span>
        {hint && <span className="block text-xs leading-snug text-slate-500">{hint}</span>}
      </span>
      {!!badge && <span className="absolute right-2.5 top-2.5 grid min-w-6 place-items-center rounded-full bg-red-600 px-1.5 text-xs font-black leading-6 text-white">{badge}</span>}
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-bold text-slate-500">{title}</h2>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </section>
  );
}

/** 오늘 내 근무 (근무표에 이름이 있으면) */
function todayShift(me: Staff, schedules: WorkSchedule[]) {
  const t = storeTime(Date.now());
  const month = `${t.year}-${pad(t.month)}`;
  const date = `${month}-${pad(t.date)}`;
  if (regularHolidays(t.year, t.month).includes(date)) return '정기휴무';
  return schedules.find(s => s.month === month)?.entries.find(e => e.date === date && e.name === me.name)?.shift;
}

/** 홈: 비상 알림 + 자주 쓰는 기능을 묶음별 큰 버튼으로 */
export default function Home({ me, counts, schedules, emergencies, onGo, onEmergency, onOpenEmergency }: {
  me: Staff; counts: Counts; schedules: WorkSchedule[]; emergencies: Emergency[];
  onGo: (to: HomeGo) => void; onEmergency: () => void; onOpenEmergency: (e: Emergency) => void;
}) {
  const t = storeTime(Date.now());
  const shift = todayShift(me, schedules);
  const active = emergencies.filter(e => !e.clearedAt);
  const ic = 'size-5';
  const icBig = 'size-6';
  return (
    <div className="space-y-5">
      {active.map(e => (
        <button key={e.id} onClick={() => onOpenEmergency(e)} className="flex w-full items-center gap-3 rounded-2xl bg-red-600 p-4 text-left text-white motion-safe:animate-pulse">
          <span className="text-3xl">{EMERGENCY_INFO[e.type].icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-black">{e.type} · 진행 중</span>
            <span className="block text-sm text-red-100">{e.location ?? '위치 확인 중'} — 눌러서 행동 요령 보기</span>
          </span>
        </button>
      ))}

      <div className="flex items-center gap-3 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black text-slate-900">{me.name} {me.title ?? '담당'}님, 안녕하세요</p>
          <p className="text-sm text-slate-500">{t.month}월 {t.date}일 · {me.dept} {me.duty}{shift ? ` · 오늘 ${shift}` : ''}</p>
        </div>
      </div>

      <button onClick={onEmergency} className="flex w-full items-center gap-3 rounded-2xl border-2 border-red-600 bg-red-50 p-4 text-left active:bg-red-100">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-red-600 text-white"><Siren className="size-7" /></span>
        <span className="min-w-0">
          <span className="block text-lg font-black text-red-700">비상 알림</span>
          <span className="block text-sm font-semibold text-red-600">🔥 화재 · 🚑 사고 · 🌪️ 재난</span>
          <span className="block text-xs text-red-500">누르면 전 직원 휴대폰에 사이렌이 울립니다</span>
        </span>
      </button>

      <Group title="자주 쓰는 기능">
        <Tile big icon={<Mic className={icBig} />} color="bg-red-500" label="말로 요청" hint="말하면 담당 부서 호출" onClick={() => onGo('voice')} />
        <Tile big icon={<ClipboardList className={icBig} />} color="bg-blue-600" label="받은 업무" hint="우리 부서 요청 처리" badge={counts.tasks} onClick={() => onGo('tasks')} />
        <Tile big icon={<Search className={icBig} />} color="bg-emerald-600" label="상품 찾기" hint="위치·행사 가격 안내" onClick={() => onGo('find')} />
        <Tile big icon={<Send className={icBig} />} color="bg-indigo-600" label="요청 보내기" hint="다른 부서에 글로 요청" onClick={() => onGo('request')} />
      </Group>

      <Group title="고객 응대">
        <Tile icon={<HeartHandshake className={ic} />} color="bg-rose-500" label="도와드리겠습니다" hint="컴플레인 접수 공유" badge={counts.complaints} onClick={() => onGo('complaint')} />
        <Tile icon={<Camera className={ic} />} color="bg-sky-600" label="사진·가격 확인" hint="가격표·바코드·전단" onClick={() => onGo('photo')} />
      </Group>

      <Group title="매장 소통">
        <Tile icon={<Megaphone className={ic} />} color="bg-orange-500" label="공지" hint="방송·중회·지시사항" badge={counts.notices} onClick={() => onGo('notice')} />
        <Tile icon={<TrendingUp className={ic} />} color="bg-violet-600" label="실적 공유" badge={counts.share} onClick={() => onGo('share')} />
        <Tile icon={<CalendarDays className={ic} />} color="bg-teal-600" label="근무표" hint="1근·2근·3근·휴무" onClick={() => onGo('schedule')} />
        <Tile icon={<TimerReset className={ic} />} color="bg-amber-600" label="소비기한 점검" badge={counts.expiry} onClick={() => onGo('expiry')} />
        <Tile icon={<Coffee className={ic} />} color="bg-[#4a2c1d]" label="커피쿠폰함" hint={counts.coupons ? `${counts.coupons}장 보관 중` : '받은 쿠폰'} onClick={() => onGo('wallet')} />
      </Group>

      <Group title="안전 · 설정">
        <Tile icon={<ShieldAlert className={ic} />} color="bg-slate-700" label="보안 신고" hint="도난 의심·빈 포장" badge={counts.incidents} onClick={() => onGo('security')} />
        <Tile icon={<Settings className={ic} />} color="bg-slate-500" label="알림 설정" hint="소리·진동·퇴근" onClick={() => onGo('settings')} />
        {me.role === 'manager' && (
          <Tile icon={<LayoutDashboard className={ic} />} color="bg-blue-800" label="관리" hint="지시사항·쿠폰·소리" onClick={() => onGo('manager')} />
        )}
      </Group>
    </div>
  );
}
