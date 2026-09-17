import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { useMenu, useShopInfo } from "../hooks/useSalon";
import { deleteMenuItem, newId, updateShopInfo, upsertMenuItem } from "../lib/salonStore";
import { formatWon } from "../lib/format";
import type { MenuCategory, ServiceMenuItem } from "../types";

const CATEGORIES: MenuCategory[] = ["컷", "펌", "염색", "클리닉", "스타일링", "기타"];
const WEEKDAYS = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="brand-heading text-2xl font-semibold">설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">샵 정보와 시술 메뉴를 관리하세요</p>
      </div>
      <ShopInfoForm />
      <MenuManager />
    </div>
  );
}

function ShopInfoForm() {
  const shop = useShopInfo();
  const [form, setForm] = useState(shop);
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(shop), [shop]);

  function toggleClosedDay(day: string) {
    setForm((f) => ({
      ...f,
      closedDays: f.closedDays.includes(day) ? f.closedDays.filter((d) => d !== day) : [...f.closedDays, day],
    }));
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    updateShopInfo(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>샵 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="샵 이름">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="원장님 이름">
              <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="전화번호">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="주소">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="오픈 시간">
              <Input type="time" value={form.openTime} onChange={(e) => setForm({ ...form, openTime: e.target.value })} />
            </Field>
            <Field label="마감 시간">
              <Input type="time" value={form.closeTime} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} />
            </Field>
            <Field label="재방문 권장 주기(일)">
              <Input
                type="number"
                value={form.revisitCycleDays}
                onChange={(e) => setForm({ ...form, revisitCycleDays: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">휴무일</span>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleClosedDay(day)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.closedDays.includes(day)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" size="sm">
            {saved ? <Check /> : null}
            {saved ? "저장됨" : "저장하기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const emptyMenuForm = { name: "", category: "컷" as MenuCategory, price: 0, durationMin: 30 };

function MenuManager() {
  const menu = useMenu();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyMenuForm);
  const [showForm, setShowForm] = useState(false);

  function startEdit(item: ServiceMenuItem) {
    setEditingId(item.id);
    setForm({ name: item.name, category: item.category, price: item.price, durationMin: item.durationMin });
    setShowForm(true);
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyMenuForm);
    setShowForm(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    upsertMenuItem({
      id: editingId ?? newId("menu"),
      name: form.name.trim(),
      category: form.category,
      price: form.price,
      durationMin: form.durationMin,
    });
    setShowForm(false);
    setEditingId(null);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>시술 메뉴</CardTitle>
        <Button size="sm" variant="outline" onClick={startAdd}>
          <Plus /> 메뉴 추가
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {showForm && (
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2.5 rounded-lg border border-border p-3 sm:grid-cols-5">
            <Input
              placeholder="메뉴명"
              className="sm:col-span-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as MenuCategory })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              placeholder="가격"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
            <Input
              type="number"
              placeholder="소요시간(분)"
              value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
            />
            <div className="col-span-2 flex gap-2 sm:col-span-5">
              <Button size="sm" type="submit">
                저장
              </Button>
              <Button size="sm" type="button" variant="outline" onClick={() => setShowForm(false)}>
                취소
              </Button>
            </div>
          </form>
        )}
        {menu.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.name} <span className="text-xs text-muted-foreground">· {m.category}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatWon(m.price)} · {m.durationMin}분
              </p>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={() => startEdit(m)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => deleteMenuItem(m.id)}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
