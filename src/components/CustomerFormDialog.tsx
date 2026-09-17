import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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
import { addCustomer, todayISO, updateCustomer } from "../lib/salonStore";
import type { Customer } from "../types";

export default function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
}) {
  const navigate = useNavigate();
  const isEdit = Boolean(customer);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"여성" | "남성" | "기타">("여성");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [tags, setTags] = useState("");
  const [allergies, setAllergies] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (!open) return;
    if (customer) {
      const [mm, dd] = customer.birthday.split("-");
      setName(customer.name);
      setPhone(customer.phone);
      setGender(customer.gender);
      setBirthMonth(mm ?? "");
      setBirthDay(dd ?? "");
      setTags(customer.tags.join(", "));
      setAllergies(customer.allergies);
      setMemo(customer.memo);
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer]);

  function reset() {
    setName("");
    setPhone("");
    setGender("여성");
    setBirthMonth("");
    setBirthDay("");
    setTags("");
    setAllergies("");
    setMemo("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const mm = birthMonth ? birthMonth.padStart(2, "0") : "01";
    const dd = birthDay ? birthDay.padStart(2, "0") : "01";
    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (isEdit && customer) {
      updateCustomer(customer.id, {
        name: name.trim(),
        phone: phone.trim(),
        gender,
        birthday: `${mm}-${dd}`,
        tags: parsedTags,
        allergies: allergies.trim(),
        memo: memo.trim(),
      });
      onOpenChange(false);
    } else {
      const created = addCustomer({
        name: name.trim(),
        phone: phone.trim(),
        gender,
        birthday: `${mm}-${dd}`,
        firstVisit: todayISO(),
        lastVisit: todayISO(),
        tags: parsedTags,
        allergies: allergies.trim(),
        memo: memo.trim(),
      });
      onOpenChange(false);
      navigate(`/customers/${created.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "고객 정보 수정" : "새 고객 등록"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="이름 *">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="전화번호">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="성별">
              <Select value={gender} onChange={(e) => setGender(e.target.value as any)}>
                <option value="여성">여성</option>
                <option value="남성">남성</option>
                <option value="기타">기타</option>
              </Select>
            </Field>
            <Field label="생일(월)">
              <Input
                inputMode="numeric"
                placeholder="MM"
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
            </Field>
            <Field label="생일(일)">
              <Input
                inputMode="numeric"
                placeholder="DD"
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
            </Field>
          </div>
          <Field label="태그 (쉼표로 구분)">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="예: 다크브라운 선호, 민감성 두피" />
          </Field>
          <Field label="알러지 / 주의사항">
            <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="예: 암모니아 계열 염색약 민감" />
          </Field>
          <Field label="메모">
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit">{isEdit ? "저장하기" : "등록하기"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
