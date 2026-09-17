import { Link } from "react-router-dom";
import { CalendarPlus, UserPlus, Cake, PhoneCall, Users, Wallet, CalendarCheck2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar } from "../../components/ui/avatar";
import { useCustomers, useReservations, useServiceRecords, useShopInfo } from "../hooks/useSalon";
import { updateReservation } from "../lib/salonStore";
import { formatWon, daysUntilBirthday, daysSince, STATUS_BADGE_CLASS, GRADE_BADGE_CLASS, GRADE_LABEL } from "../lib/format";
import { todayISO } from "../lib/salonStore";

export default function Dashboard() {
  const customers = useCustomers();
  const reservations = useReservations();
  const records = useServiceRecords();
  const shop = useShopInfo();

  const today = todayISO();
  const todayReservations = reservations
    .filter((r) => r.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthRevenue = records.filter((r) => r.date.startsWith(monthPrefix)).reduce((s, r) => s + r.price, 0);
  const todayReservationCount = todayReservations.length;

  const upcomingBirthdays = customers
    .map((c) => ({ c, days: daysUntilBirthday(c.birthday) }))
    .filter((x) => x.days <= 14)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  const reengageCustomers = customers
    .map((c) => ({ c, days: daysSince(c.lastVisit) }))
    .filter((x) => x.days >= shop.revisitCycleDays)
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);

  function customerName(customerId: string) {
    return customers.find((c) => c.id === customerId)?.name ?? "알 수 없음";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="brand-heading text-2xl font-semibold">
            안녕하세요, {shop.ownerName}님
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">오늘도 좋은 하루 보내세요 · {shop.name}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/reservations?new=1">
            <Button variant="outline" size="sm">
              <CalendarPlus /> 예약 추가
            </Button>
          </Link>
          <Link to="/customers?new=1">
            <Button size="sm">
              <UserPlus /> 고객 추가
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={CalendarCheck2} label="오늘 예약" value={`${todayReservationCount}건`} />
        <StatCard icon={Wallet} label="이번 달 매출" value={formatWon(monthRevenue)} />
        <StatCard icon={Users} label="전체 고객" value={`${customers.length}명`} />
        <StatCard icon={Cake} label="생일 임박" value={`${upcomingBirthdays.length}명`} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>오늘의 예약</CardTitle>
          <Link to="/reservations" className="text-xs text-primary hover:underline">
            전체 보기
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayReservations.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">오늘 예약이 없습니다.</p>
          )}
          {todayReservations.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="w-14 shrink-0 text-sm font-semibold text-primary">{r.time}</div>
              <Avatar name={customerName(r.customerId)} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{customerName(r.customerId)}</p>
              </div>
              <Badge className={STATUS_BADGE_CLASS[r.status]}>{r.status}</Badge>
              {r.status === "예약" && (
                <div className="hidden gap-1 sm:flex">
                  <Button size="xs" variant="outline" onClick={() => updateReservation(r.id, { status: "완료" })}>
                    완료
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => updateReservation(r.id, { status: "노쇼" })}>
                    노쇼
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="size-4 text-primary" /> 생일 임박 고객
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingBirthdays.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">2주 내 생일인 고객이 없습니다.</p>
            )}
            {upcomingBirthdays.map(({ c, days }) => (
              <Link
                key={c.id}
                to={`/customers/${c.id}`}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <Avatar name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.birthday}</p>
                </div>
                <Badge variant="outline">{days === 0 ? "오늘" : `D-${days}`}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="size-4 text-primary" /> 재방문 권유가 필요한 고객
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reengageCustomers.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">모두 최근에 방문했어요.</p>
            )}
            {reengageCustomers.map(({ c, days }) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
                <Avatar name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link to={`/customers/${c.id}`} className="truncate text-sm font-medium hover:underline">
                    {c.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="outline" className={`mr-1 ${GRADE_BADGE_CLASS[c.grade]}`}>
                      {GRADE_LABEL[c.grade]}
                    </Badge>
                    {days}일째 미방문
                  </p>
                </div>
                <Link to={`/ai?customer=${c.id}&tool=reminder`}>
                  <Button size="xs" variant="outline">
                    문자 작성
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-1">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] text-muted-foreground">{label}</p>
          <p className="truncate text-base font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
