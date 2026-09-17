import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar } from "../../components/ui/avatar";
import { Input } from "../../components/ui/input";
import CustomerFormDialog from "../components/CustomerFormDialog";
import { useCustomers } from "../hooks/useSalon";
import { formatDateKR, GRADE_BADGE_CLASS, GRADE_LABEL } from "../lib/format";
import type { CustomerGrade } from "../types";

const FILTERS: Array<{ key: CustomerGrade | "all"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "new", label: "신규" },
  { key: "regular", label: "단골" },
  { key: "vip", label: "VIP" },
];

export default function Customers() {
  const customers = useCustomers();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CustomerGrade | "all">("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const [addOpen, setAddOpen] = useState(searchParams.get("new") === "1");

  const filtered = useMemo(() => {
    return customers
      .filter((c) => (filter === "all" ? true : c.grade === filter))
      .filter((c) => c.name.includes(query) || c.phone.includes(query))
      .sort((a, b) => (a.lastVisit < b.lastVisit ? 1 : -1));
  }, [customers, query, filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brand-heading text-2xl font-semibold">고객</h1>
          <p className="mt-1 text-sm text-muted-foreground">총 {customers.length}명의 고객</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setAddOpen(true);
          }}
        >
          <UserPlus /> 고객 추가
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="이름 또는 전화번호로 검색"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {filtered.map((c) => (
          <Link key={c.id} to={`/customers/${c.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-3 py-1">
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <Badge className={GRADE_BADGE_CLASS[c.grade]}>{GRADE_LABEL[c.grade]}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.phone} · 방문 {c.visitCount}회 · 최근 {formatDateKR(c.lastVisit)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            검색 결과가 없습니다.
          </p>
        )}
      </div>

      <CustomerFormDialog
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v && searchParams.get("new")) {
            searchParams.delete("new");
            setSearchParams(searchParams, { replace: true });
          }
        }}
      />
    </div>
  );
}
