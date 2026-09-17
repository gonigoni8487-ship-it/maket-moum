import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Plus, Sparkles, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar } from "../../components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import CustomerFormDialog from "../components/CustomerFormDialog";
import ServiceRecordDialog from "../components/ServiceRecordDialog";
import { useCustomer, useMenu, useReservations, useServiceRecords } from "../hooks/useSalon";
import { deleteCustomer } from "../lib/salonStore";
import { formatDateKR, formatWon, GRADE_BADGE_CLASS, GRADE_LABEL, STATUS_BADGE_CLASS } from "../lib/format";

export default function CustomerDetail() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const customer = useCustomer(customerId);
  const records = useServiceRecords(customerId).sort((a, b) => (a.date < b.date ? 1 : -1));
  const reservations = useReservations()
    .filter((r) => r.customerId === customerId)
    .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  const menu = useMenu();

  const [editOpen, setEditOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);

  function menuNames(ids: string[]) {
    return ids.map((id) => menu.find((m) => m.id === id)?.name ?? "기타").join(", ");
  }

  if (!customer) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">고객을 찾을 수 없습니다.</p>
        <Link to="/customers" className="mt-3 inline-block text-sm text-primary hover:underline">
          고객 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> 고객 목록
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={customer.name} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="brand-heading text-xl font-semibold">{customer.name}</h1>
              <Badge className={GRADE_BADGE_CLASS[customer.grade]}>{GRADE_LABEL[customer.grade]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {customer.phone || "전화번호 미등록"} · {customer.gender} · 생일 {customer.birthday}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil /> 수정
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm(`${customer.name} 고객 정보를 삭제할까요? 되돌릴 수 없습니다.`)) {
                deleteCustomer(customer.id);
                navigate("/customers");
              }
            }}
          >
            <Trash2 /> 삭제
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="방문 횟수" value={`${customer.visitCount}회`} />
        <StatBox label="누적 매출" value={formatWon(customer.totalSpent)} />
        <StatBox label="첫 방문" value={formatDateKR(customer.firstVisit)} />
        <StatBox label="최근 방문" value={formatDateKR(customer.lastVisit)} />
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">프로필</TabsTrigger>
          <TabsTrigger value="records">시술 이력</TabsTrigger>
          <TabsTrigger value="reservations">예약</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-3">
          <Card>
            <CardContent className="space-y-3 py-1">
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">태그</p>
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags.length === 0 && <span className="text-sm text-muted-foreground">등록된 태그가 없습니다.</span>}
                  {customer.tags.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              {customer.allergies && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{customer.allergies}</span>
                </div>
              )}
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">메모</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {customer.memo || "메모가 없습니다."}
                </p>
              </div>
            </CardContent>
          </Card>
          <Link to={`/ai?customer=${customer.id}&tool=style`}>
            <Button variant="outline" className="w-full">
              <Sparkles /> 이 고객을 위한 AI 스타일 추천 받기
            </Button>
          </Link>
        </TabsContent>

        <TabsContent value="records" className="mt-4 space-y-2.5">
          <Button size="sm" onClick={() => setRecordOpen(true)}>
            <Plus /> 시술 기록 추가
          </Button>
          {records.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">시술 기록이 없습니다.</p>
          )}
          {records.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-1.5 py-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{formatDateKR(r.date)}</p>
                  <p className="text-sm font-semibold text-primary">{formatWon(r.price)}</p>
                </div>
                <p className="text-sm text-foreground/80">{menuNames(r.menuItemIds)}</p>
                {r.formula && (
                  <p className="rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
                    레시피: {r.formula}
                  </p>
                )}
                {r.stylistNote && <p className="text-xs text-muted-foreground">메모: {r.stylistNote}</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reservations" className="mt-4 space-y-2.5">
          <Link to={`/reservations?new=1&customer=${customer.id}`}>
            <Button size="sm">
              <Plus /> 예약 추가
            </Button>
          </Link>
          {reservations.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">예약 내역이 없습니다.</p>
          )}
          {reservations.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-semibold">
                    {formatDateKR(r.date)} {r.time}
                  </p>
                  <p className="text-xs text-muted-foreground">{menuNames(r.menuItemIds)}</p>
                </div>
                <Badge className={STATUS_BADGE_CLASS[r.status]}>{r.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />
      <ServiceRecordDialog open={recordOpen} onOpenChange={setRecordOpen} customerId={customer.id} />
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
