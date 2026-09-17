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
import { addServiceRecord, todayISO } from "../lib/salonStore";
import { useMenu } from "../hooks/useSalon";
import { formatWon } from "../lib/format";

export default function ServiceRecordDialog({
  open,
  onOpenChange,
  customerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
}) {
  const menu = useMenu();
  const [date, setDate] = useState(todayISO());
  const [selectedMenu, setSelectedMenu] = useState<string[]>([]);
  const [price, setPrice] = useState<number>(0);
  const [priceTouched, setPriceTouched] = useState(false);
  const [formula, setFormula] = useState("");
  const [stylistNote, setStylistNote] = useState("");

  useEffect(() => {
    if (open) {
      setDate(todayISO());
      setSelectedMenu([]);
      setPrice(0);
      setPriceTouched(false);
      setFormula("");
      setStylistNote("");
    }
  }, [open]);

  useEffect(() => {
    if (priceTouched) return;
    const sum = menu.filter((m) => selectedMenu.includes(m.id)).reduce((s, m) => s + m.price, 0);
    setPrice(sum);
  }, [selectedMenu, menu, priceTouched]);

  function toggleMenu(id: string) {
    setSelectedMenu((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (selectedMenu.length === 0) return;
    addServiceRecord({
      customerId,
      date,
      menuItemIds: selectedMenu,
      price,
      formula: formula.trim(),
      stylistNote: stylistNote.trim(),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>시술 기록 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">시술일</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">시술 메뉴 (복수 선택 가능)</span>
            <div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-border p-2">
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
            <span className="text-xs font-medium text-muted-foreground">결제 금액</span>
            <Input
              type="number"
              value={price}
              onChange={(e) => {
                setPriceTouched(true);
                setPrice(Number(e.target.value));
              }}
            />
            <span className="text-[11px] text-muted-foreground">{formatWon(price)}</span>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">시술 레시피 / 배합 노트</span>
            <Textarea
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              rows={2}
              placeholder="예: 멜라닌 8g + 산화제 6% 1:1, 30분 방치"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">스타일리스트 메모</span>
            <Textarea value={stylistNote} onChange={(e) => setStylistNote(e.target.value)} rows={2} />
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={selectedMenu.length === 0}>
              저장하기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
