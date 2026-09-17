import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { useCustomers, useServiceRecords, useShopInfo } from "../hooks/useSalon";
import type { StyleRecommendationResponse } from "../types";

const OCCASIONS = ["재방문 권유", "생일 축하", "예약 확인", "감사 인사"];

export default function AITools() {
  const [searchParams] = useSearchParams();
  const customers = useCustomers();
  const shop = useShopInfo();
  const [customerId, setCustomerId] = useState(searchParams.get("customer") ?? customers[0]?.id ?? "");
  const initialTab = searchParams.get("tool") === "reminder" ? "reminder" : "style";

  useEffect(() => {
    if (!customerId && customers[0]) setCustomerId(customers[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers.length]);

  const customer = customers.find((c) => c.id === customerId);
  const records = useServiceRecords(customerId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="brand-heading text-2xl font-semibold">AI 도구</h1>
        <p className="mt-1 text-sm text-muted-foreground">고객 데이터를 바탕으로 스타일 추천과 메시지를 작성해드려요</p>
      </div>

      <label className="block max-w-sm space-y-1">
        <span className="text-xs font-medium text-muted-foreground">고객 선택</span>
        <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          {customers.length === 0 && <option value="">등록된 고객이 없습니다</option>}
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </label>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="style">스타일 추천</TabsTrigger>
          <TabsTrigger value="reminder">리마인더 메시지</TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="mt-4">
          <StyleRecommendationPanel customer={customer} recentServiceCount={records.length} />
        </TabsContent>
        <TabsContent value="reminder" className="mt-4">
          <ReminderMessagePanel customer={customer} shopName={shop.name} ownerName={shop.ownerName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StyleRecommendationPanel({
  customer,
  recentServiceCount,
}: {
  customer: ReturnType<typeof useCustomers>[number] | undefined;
  recentServiceCount: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<StyleRecommendationResponse | null>(null);

  async function handleGenerate() {
    if (!customer) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/ai/style-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customer.name,
          gender: customer.gender,
          tags: customer.tags,
          memo: customer.memo,
          recentServices: `총 ${recentServiceCount}회 방문`,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("스타일 추천을 불러오지 못했어요. GEMINI_API_KEY 설정을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" /> 맞춤 스타일 추천
        </CardTitle>
        <Button size="sm" onClick={handleGenerate} disabled={!customer || loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          추천 받기
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!customer && <p className="text-sm text-muted-foreground">먼저 고객을 등록하고 선택해주세요.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!result && !loading && !error && customer && (
          <p className="text-sm text-muted-foreground">
            {customer.name} 고객의 태그, 메모, 시술 이력을 바탕으로 어울리는 헤어스타일과 컬러를 추천해드려요.
          </p>
        )}
        {result?.recommendations.map((rec, i) => (
          <div key={i} className="rounded-lg border border-border p-3">
            <p className="text-sm font-semibold text-primary">{rec.title}</p>
            <p className="mt-1 text-sm text-foreground/90">{rec.description}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">💡 {rec.whyItFits}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReminderMessagePanel({
  customer,
  shopName,
  ownerName,
}: {
  customer: ReturnType<typeof useCustomers>[number] | undefined;
  shopName: string;
  ownerName: string;
}) {
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!customer) return;
    setLoading(true);
    setError("");
    setMessage("");
    setCopied(false);
    try {
      const res = await fetch("/api/ai/reminder-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customer.name,
          occasion,
          shopName,
          ownerName,
          extra,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setMessage(data.message);
    } catch {
      setError("메시지 생성에 실패했어요. GEMINI_API_KEY 설정을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable, ignore
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" /> 문자 / 카카오톡 메시지 작성
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!customer && <p className="text-sm text-muted-foreground">먼저 고객을 등록하고 선택해주세요.</p>}
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">메시지 목적</span>
            <Select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
              {OCCASIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleGenerate} disabled={!customer || loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              메시지 생성
            </Button>
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">추가 요청사항 (선택)</span>
          <Textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            rows={2}
            placeholder="예: 이번 주 평일 한정 20% 할인 이벤트 안내 추가해줘"
          />
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {message && (
          <div className="space-y-2 rounded-lg bg-muted p-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
            <Button size="xs" variant="outline" onClick={handleCopy}>
              {copied ? <Check /> : <Copy />}
              {copied ? "복사됨" : "복사하기"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
