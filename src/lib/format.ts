export function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function formatDateKR(iso: string) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function daysSince(iso: string) {
  const then = new Date(iso + "T00:00:00").getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now.getTime() - then) / 86400000);
}

// birthday: "MM-DD" -> days until next occurrence (0 = today)
export function daysUntilBirthday(birthday: string) {
  const [mm, dd] = birthday.split("-").map(Number);
  if (!mm || !dd) return Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let next = new Date(now.getFullYear(), mm - 1, dd);
  if (next.getTime() < now.getTime()) {
    next = new Date(now.getFullYear() + 1, mm - 1, dd);
  }
  return Math.round((next.getTime() - now.getTime()) / 86400000);
}

const WEEKDAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayKR(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return WEEKDAYS_KR[d.getDay()];
}

export const GRADE_LABEL: Record<string, string> = {
  new: "신규",
  regular: "단골",
  vip: "VIP",
};

export const GRADE_BADGE_CLASS: Record<string, string> = {
  new: "bg-muted text-muted-foreground",
  regular: "bg-secondary text-secondary-foreground",
  vip: "bg-primary text-primary-foreground",
};

export const STATUS_BADGE_CLASS: Record<string, string> = {
  예약: "bg-secondary text-secondary-foreground",
  완료: "bg-primary/10 text-primary",
  노쇼: "bg-destructive/10 text-destructive",
  취소: "bg-muted text-muted-foreground",
};
