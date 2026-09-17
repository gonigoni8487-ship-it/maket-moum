import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BarChart3,
  Sparkles,
  Settings,
  Scissors,
} from "lucide-react";
import { useShopInfo } from "../hooks/useSalon";

const NAV_ITEMS = [
  { to: "/", label: "대시보드", icon: LayoutDashboard },
  { to: "/customers", label: "고객", icon: Users },
  { to: "/reservations", label: "예약", icon: CalendarDays },
  { to: "/stats", label: "매출", icon: BarChart3 },
  { to: "/ai", label: "AI 도구", icon: Sparkles },
  { to: "/settings", label: "설정", icon: Settings },
];

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const shop = useShopInfo();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Scissors className="size-4.5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="brand-heading text-lg font-semibold text-primary">더예로</span>
            <span className="text-[10px] tracking-widest text-muted-foreground uppercase">Deoyero</span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(location.pathname, item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mx-3 mb-6 rounded-xl bg-muted p-4">
          <p className="text-xs text-muted-foreground">운영중인 샵</p>
          <p className="mt-1 truncate text-sm font-semibold">{shop.name}</p>
          <p className="text-xs text-muted-foreground">{shop.ownerName} 원장님</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-h-screen flex-col md:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scissors className="size-4" />
            </div>
            <span className="brand-heading text-base font-semibold text-primary">더예로</span>
          </div>
          <span className="text-xs text-muted-foreground">{shop.name}</span>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-card/95 py-2 backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(location.pathname, item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
