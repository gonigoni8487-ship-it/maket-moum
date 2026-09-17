import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar } from "../../components/ui/avatar";
import ReservationDialog from "../components/ReservationDialog";
import { useCustomers, useMenu, useReservations } from "../hooks/useSalon";
import { deleteReservation, offsetDate, todayISO, updateReservation } from "../lib/salonStore";
import { STATUS_BADGE_CLASS, weekdayKR } from "../lib/format";
import type { ReservationStatus } from "../types";

function startOfWeek(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return d;
}

function weekDates(anchorIso: string) {
  const start = startOfWeek(anchorIso);
  return Array.from({ length: 7 }, (_, i) => offsetDate(i, start));
}

export default function Reservations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const customers = useCustomers();
  const menu = useMenu();
  const reservations = useReservations();

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [dialogOpen, setDialogOpen] = useState(searchParams.get("new") === "1");

  const days = useMemo(() => weekDates(selectedDate), [selectedDate]);

  function customerName(customerId: string) {
    return customers.find((c) => c.id === customerId)?.name ?? "알 수 없음";
  }
  function menuNames(ids: string[]) {
    return ids.map((id) => menu.find((m) => m.id === id)?.name ?? "기타").join(", ");
  }

  const dayReservations = reservations
    .filter((r) => r.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  function closeDialog(v: boolean) {
    setDialogOpen(v);
    if (!v && (searchParams.get("new") || searchParams.get("customer"))) {
      searchParams.delete("new");
      searchParams.delete("customer");
      setSearchParams(searchParams, { replace: true });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brand-heading text-2xl font-semibold">예약</h1>
          <p className="mt-1 text-sm text-muted-foreground">주간 일정을 한눈에 확인하세요</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus /> 예약 추가
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => setSelectedDate(offsetDate(-7, new Date(selectedDate + "T00:00:00")))}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {days.map((d) => {
            const count = reservations.filter((r) => r.date === d).length;
            const isSelected = d === selectedDate;
            const isToday = d === todayISO();
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`flex flex-col items-center gap-0.5 rounded-lg py-2 text-xs transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-muted"
                }`}
              >
                <span className="opacity-70">{weekdayKR(d)}</span>
                <span className="text-sm font-semibold">{Number(d.slice(8, 10))}</span>
                {count > 0 && (
                  <span className={`size-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                )}
              </button>
            );
          })}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setSelectedDate(offsetDate(7, new Date(selectedDate + "T00:00:00")))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {selectedDate} ({weekdayKR(selectedDate)}요일) · {dayReservations.length}건
        </p>
        {selectedDate !== todayISO() && (
          <button className="text-xs text-primary hover:underline" onClick={() => setSelectedDate(todayISO())}>
            오늘로 이동
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {dayReservations.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">예약이 없습니다.</p>
        )}
        {dayReservations.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-2.5 py-1 sm:flex-row sm:items-center">
              <div className="w-14 shrink-0 text-sm font-semibold text-primary">{r.time}</div>
              <Avatar name={customerName(r.customerId)} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{customerName(r.customerId)}</p>
                <p className="truncate text-xs text-muted-foreground">{menuNames(r.menuItemIds)}</p>
                {r.memo && <p className="truncate text-xs text-muted-foreground">메모: {r.memo}</p>}
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className={STATUS_BADGE_CLASS[r.status]}>{r.status}</Badge>
                <StatusMenu
                  onChange={(status) => updateReservation(r.id, { status })}
                  onDelete={() => deleteReservation(r.id)}
                  current={r.status}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ReservationDialog
        open={dialogOpen}
        onOpenChange={closeDialog}
        defaultDate={selectedDate}
        defaultCustomerId={searchParams.get("customer") ?? undefined}
      />
    </div>
  );
}

function StatusMenu({
  current,
  onChange,
  onDelete,
}: {
  current: ReservationStatus;
  onChange: (status: ReservationStatus) => void;
  onDelete: () => void;
}) {
  const options: ReservationStatus[] = ["예약", "완료", "노쇼", "취소"];
  return (
    <div className="flex gap-1">
      {options
        .filter((o) => o !== current)
        .slice(0, 2)
        .map((o) => (
          <Button key={o} size="xs" variant="outline" onClick={() => onChange(o)}>
            {o}
          </Button>
        ))}
      <Button size="xs" variant="ghost" onClick={onDelete}>
        삭제
      </Button>
    </div>
  );
}
