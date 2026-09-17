import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useCustomers, useMenu, useServiceRecords } from "../hooks/useSalon";
import { formatWon, GRADE_BADGE_CLASS, GRADE_LABEL } from "../lib/format";

const MONTH_LABEL = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function monthsBack(n: number) {
  const now = new Date();
  const result: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({ key, label: MONTH_LABEL[d.getMonth()] });
  }
  return result;
}

export default function Stats() {
  const customers = useCustomers();
  const records = useServiceRecords();
  const menu = useMenu();

  const monthly = useMemo(() => {
    const months = monthsBack(6);
    return months.map((m) => ({
      ...m,
      revenue: records.filter((r) => r.date.startsWith(m.key)).reduce((s, r) => s + r.price, 0),
    }));
  }, [records]);

  const maxRevenue = Math.max(1, ...monthly.map((m) => m.revenue));
  const thisMonthRevenue = monthly[monthly.length - 1]?.revenue ?? 0;
  const lastMonthRevenue = monthly[monthly.length - 2]?.revenue ?? 0;
  const momChange = lastMonthRevenue === 0 ? null : Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);

  const popularMenu = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of records) {
      for (const id of r.menuItemIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([id, count]) => ({ menuItem: menu.find((m) => m.id === id), count }))
      .filter((x) => x.menuItem)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [records, menu]);

  const maxMenuCount = Math.max(1, ...popularMenu.map((m) => m.count));

  const gradeCounts = useMemo(() => {
    return {
      new: customers.filter((c) => c.grade === "new").length,
      regular: customers.filter((c) => c.grade === "regular").length,
      vip: customers.filter((c) => c.grade === "vip").length,
    };
  }, [customers]);

  const revisitRate =
    customers.length === 0 ? 0 : Math.round((customers.filter((c) => c.visitCount >= 2).length / customers.length) * 100);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="brand-heading text-2xl font-semibold">매출 &amp; 통계</h1>
        <p className="mt-1 text-sm text-muted-foreground">샵 운영 현황을 한눈에 확인하세요</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="이번 달 매출" value={formatWon(thisMonthRevenue)} />
        <StatBox
          label="전월 대비"
          value={momChange === null ? "-" : `${momChange > 0 ? "+" : ""}${momChange}%`}
        />
        <StatBox label="재방문율" value={`${revisitRate}%`} />
        <StatBox label="전체 고객" value={`${customers.length}명`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 6개월 매출</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-end gap-3">
            {monthly.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {m.revenue > 0 ? `${Math.round(m.revenue / 10000)}만` : ""}
                </span>
                <div
                  className="w-full rounded-t-md bg-primary/80"
                  style={{ height: `${Math.max(4, (m.revenue / maxRevenue) * 100)}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>인기 시술 TOP 6</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {popularMenu.length === 0 && <p className="text-sm text-muted-foreground">아직 시술 기록이 없습니다.</p>}
            {popularMenu.map(({ menuItem, count }) => (
              <div key={menuItem!.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{menuItem!.name}</span>
                  <span className="text-muted-foreground">{count}회</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(count / maxMenuCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>고객 등급 분포</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(["vip", "regular", "new"] as const).map((g) => {
              const count = gradeCounts[g];
              const pct = customers.length === 0 ? 0 : Math.round((count / customers.length) * 100);
              return (
                <div key={g} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${GRADE_BADGE_CLASS[g]}`}>{GRADE_LABEL[g]}</span>
                    <span className="text-muted-foreground">
                      {count}명 ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-1">
        <p className="truncate text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-base font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
