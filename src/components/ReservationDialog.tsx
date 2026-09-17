import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select } from "../../components/ui/select";
import { addReservation } from "../lib/salonStore";
import { useCustomers, useMenu } from "../hooks/useSalon";

export default function ReservationDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultCustomerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string;
  defaultCustomerId?: string;
}) {
  const customers = useCustomers();
  const menu = useMenu();
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("10:00");
  const [selectedMenu, setSelectedMenu] = useState<string[]>([]);
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (open) {
      setCustomerId(defaultCustomerId ?? customers[0]?.id ?? "");
      setDate(defaultDate);
      setTime("10:00");
      setSelectedMenu([]);
      setMemo("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate, defaultCustomerId]);

  function toggleMenu(id: string) {
    setSelectedMenu((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customerId || selectedMenu.length === 0) return;
    const durationMin = menu
      .filter((m) => selectedMenu.includes(m.id))
      .reduce((s, m) => s + m.durationMin, 0);
    addReservation({
      customerId,
      date,
      time,
      durationMin: durationMin || 30,
      menuItemIds: selectedMenu,
      status: "예약",
      memo: memo.trim(),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>예약 추가</DialogTitle>
        </DialogHeader>
        {customers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">먼저 고객을 등록해주세요.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">고객</span>
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </Select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted-foreground">날짜</span>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted-foreground">시간</span>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">시술 메뉴</span>
              <div className="grid max-h-36 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-border p-2">
                {menu.map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs ${
                      selectedMenu.includes(m.id) ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-[var(--color-primary)]"
                      checked={selectedMenu.includes(m.id)}
                      onChange={() => toggleMenu(m.id)}
                    />
                    {m.name}
                  </label>
                ))}
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">메모</span>
              <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} />
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button type="submit" disabled={!customerId || selectedMenu.length === 0}>
                예약 등록
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
