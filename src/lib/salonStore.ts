import type {
  Customer,
  CustomerGrade,
  Reservation,
  ServiceMenuItem,
  ServiceRecord,
  ShopInfo,
  SalonDB,
} from "../types";

const STORAGE_KEY = "deoyero-salon-db-v1";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function offsetDate(offsetDays: number, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  return toISODate(d);
}

export function todayISO() {
  return toISODate(new Date());
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_MENU: ServiceMenuItem[] = [
  { id: "menu_cut_w", name: "여성 커트", category: "컷", price: 25000, durationMin: 40 },
  { id: "menu_cut_m", name: "남성 커트", category: "컷", price: 18000, durationMin: 30 },
  { id: "menu_perm_digi", name: "디지털펌", category: "펌", price: 130000, durationMin: 180 },
  { id: "menu_perm_setting", name: "세팅펌", category: "펌", price: 110000, durationMin: 150 },
  { id: "menu_color_full", name: "전체 염색", category: "염색", price: 90000, durationMin: 120 },
  { id: "menu_color_root", name: "뿌리 염색", category: "염색", price: 55000, durationMin: 70 },
  { id: "menu_clinic", name: "두피 클리닉", category: "클리닉", price: 45000, durationMin: 50 },
  { id: "menu_styling", name: "드라이 스타일링", category: "스타일링", price: 20000, durationMin: 30 },
];

const DEFAULT_SHOP: ShopInfo = {
  name: "더예로 헤어샵",
  ownerName: "원장님",
  phone: "010-1234-5678",
  address: "서울시 마포구 어딘가로 12길 8",
  openTime: "10:00",
  closeTime: "20:00",
  closedDays: ["월요일"],
  revisitCycleDays: 45,
};

function gradeFromVisits(visitCount: number): CustomerGrade {
  if (visitCount >= 8) return "vip";
  if (visitCount >= 3) return "regular";
  return "new";
}

const SEED_CUSTOMERS: Array<{
  name: string;
  phone: string;
  gender: Customer["gender"];
  birthdayOffsetDays: number;
  visits: number;
  lastVisitOffset: number;
  tags: string[];
  allergies: string;
  memo: string;
}> = [
  { name: "김서연", phone: "010-2231-8845", gender: "여성", birthdayOffsetDays: 4, visits: 12, lastVisitOffset: -18, tags: ["다크브라운 선호", "민감성 두피"], allergies: "암모니아 계열 염색약 민감", memo: "말수가 적은 편, 조용한 시술 선호. 매번 같은 브라운 톤 유지." },
  { name: "이하은", phone: "010-3342-1190", gender: "여성", birthdayOffsetDays: 12, visits: 3, lastVisitOffset: -50, tags: ["애쉬 계열 선호", "곱슬머리"], allergies: "", memo: "최근 웨이브펌 만족도 높았음. 다음엔 톤다운 염색 희망." },
  { name: "박지훈", phone: "010-4453-2201", gender: "남성", birthdayOffsetDays: -6, visits: 6, lastVisitOffset: -22, tags: ["짧은 스타일", "왁스 스타일링"], allergies: "", memo: "3주 주기로 꾸준히 방문. 투블럭 유지." },
  { name: "최유나", phone: "010-5564-3312", gender: "여성", birthdayOffsetDays: 2, visits: 15, lastVisitOffset: -9, tags: ["VIP", "디지털펌 단골"], allergies: "두피 자극에 약함, 저자극 약제 사용", memo: "결혼식 전 스타일 상담 예정. 꼼꼼한 설명 원함." },
  { name: "정민서", phone: "010-6675-4423", gender: "여성", birthdayOffsetDays: 40, visits: 1, lastVisitOffset: -3, tags: ["신규", "첫방문 이벤트"], allergies: "", memo: "인스타그램 보고 첫 방문. 밝은 브라운 컬러 문의." },
  { name: "강도윤", phone: "010-7786-5534", gender: "남성", birthdayOffsetDays: -20, visits: 9, lastVisitOffset: -60, tags: ["펌 단골"], allergies: "", memo: "재방문 주기가 길어지는 중, 리마인더 발송 추천." },
  { name: "윤소율", phone: "010-8897-6645", gender: "여성", birthdayOffsetDays: 1, visits: 20, lastVisitOffset: -5, tags: ["VIP", "생일 임박"], allergies: "", memo: "샵 최장기 단골. 매달 클리닉 관리 받음." },
  { name: "임채원", phone: "010-9908-7756", gender: "여성", birthdayOffsetDays: 25, visits: 5, lastVisitOffset: -33, tags: ["레이어드컷 선호"], allergies: "펌제 자극 민감", memo: "저자극 펌제만 사용 요청." },
  { name: "한지호", phone: "010-1019-8867", gender: "남성", birthdayOffsetDays: -3, visits: 2, lastVisitOffset: -70, tags: ["신규"], allergies: "", memo: "오랜만에 연락 필요, 이탈 위험군." },
  { name: "오다인", phone: "010-2120-9978", gender: "여성", birthdayOffsetDays: 8, visits: 11, lastVisitOffset: -14, tags: ["염색 단골", "허리까지 긴 머리"], allergies: "", memo: "긴 머리 손상 관리 신경써서 상담." },
];

function buildSeed(): SalonDB {
  const menu = DEFAULT_MENU;
  const customers: Customer[] = [];
  const serviceRecords: ServiceRecord[] = [];
  const reservations: Reservation[] = [];

  for (const s of SEED_CUSTOMERS) {
    const custId = id("cust");
    const bday = new Date();
    bday.setDate(bday.getDate() + s.birthdayOffsetDays);
    const birthday = `${pad(bday.getMonth() + 1)}-${pad(bday.getDate())}`;

    const grade = gradeFromVisits(s.visits);
    let totalSpent = 0;
    const numRecords = Math.min(s.visits, 5);
    for (let i = 0; i < numRecords; i++) {
      const menuItem = menu[Math.floor(Math.random() * menu.length)];
      const daysAgo = -s.lastVisitOffset + i * (18 + Math.floor(Math.random() * 10));
      totalSpent += menuItem.price;
      serviceRecords.push({
        id: id("rec"),
        customerId: custId,
        date: offsetDate(-daysAgo),
        menuItemIds: [menuItem.id],
        price: menuItem.price,
        formula: menuItem.category === "염색" ? "멜라닌 8g + 산화제 6% 1:1, 30분 방치" : menuItem.category === "펌" ? "중간 로드 사용, 열펌 8분" : "",
        stylistNote: "",
      });
    }
    if (s.visits > numRecords) {
      totalSpent += (s.visits - numRecords) * 60000;
    }

    customers.push({
      id: custId,
      name: s.name,
      phone: s.phone,
      gender: s.gender,
      birthday,
      firstVisit: offsetDate(s.lastVisitOffset - s.visits * 25),
      lastVisit: offsetDate(s.lastVisitOffset),
      visitCount: s.visits,
      totalSpent,
      grade,
      tags: s.tags,
      allergies: s.allergies,
      memo: s.memo,
    });
  }

  // Today & tomorrow reservations for a lively dashboard
  const todaySlots = ["10:30", "13:00", "15:30", "18:00"];
  todaySlots.forEach((time, i) => {
    const cust = customers[i % customers.length];
    const menuItem = menu[i % menu.length];
    reservations.push({
      id: id("rsv"),
      customerId: cust.id,
      date: todayISO(),
      time,
      durationMin: menuItem.durationMin,
      menuItemIds: [menuItem.id],
      status: i === 0 ? "완료" : "예약",
      memo: "",
    });
  });

  const tomorrowSlots = ["11:00", "14:00", "16:30"];
  tomorrowSlots.forEach((time, i) => {
    const cust = customers[(i + 3) % customers.length];
    const menuItem = menu[(i + 2) % menu.length];
    reservations.push({
      id: id("rsv"),
      customerId: cust.id,
      date: offsetDate(1),
      time,
      durationMin: menuItem.durationMin,
      menuItemIds: [menuItem.id],
      status: "예약",
      memo: "",
    });
  });

  reservations.push({
    id: id("rsv"),
    customerId: customers[5].id,
    date: offsetDate(-2),
    time: "17:00",
    durationMin: 60,
    menuItemIds: [menu[2].id],
    status: "노쇼",
    memo: "연락 두절",
  });

  return { customers, reservations, serviceRecords, menu, shopInfo: DEFAULT_SHOP };
}

function reviveDates(_db: SalonDB) {
  // placeholder for future migrations
}

export function loadDB(): SalonDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SalonDB;
      if (parsed && Array.isArray(parsed.customers)) {
        parsed.shopInfo = { ...DEFAULT_SHOP, ...parsed.shopInfo };
        reviveDates(parsed);
        return parsed;
      }
    }
  } catch {
    // fall through to reseed
  }
  const seeded = buildSeed();
  saveDB(seeded);
  return seeded;
}

export function saveDB(db: SalonDB) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// ---- listeners for cross-component sync ----
type Listener = () => void;
const listeners = new Set<Listener>();
let state: SalonDB | null = null;

export function getState(): SalonDB {
  if (!state) state = loadDB();
  return state;
}

function setState(next: SalonDB) {
  state = next;
  saveDB(next);
  listeners.forEach((l) => l());
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function recalcCustomer(db: SalonDB, customerId: string): SalonDB {
  const records = db.serviceRecords.filter((r) => r.customerId === customerId);
  const visitCount = records.length;
  const totalSpent = records.reduce((sum, r) => sum + r.price, 0);
  const lastVisit = records.reduce((latest, r) => (r.date > latest ? r.date : latest), "0000-00-00");
  const grade = gradeFromVisits(visitCount);
  return {
    ...db,
    customers: db.customers.map((c) =>
      c.id === customerId
        ? {
            ...c,
            visitCount,
            totalSpent,
            lastVisit: lastVisit === "0000-00-00" ? c.lastVisit : lastVisit,
            grade,
          }
        : c
    ),
  };
}

// ---- Mutations ----
export function addCustomer(input: Omit<Customer, "id" | "visitCount" | "totalSpent" | "grade">) {
  const db = getState();
  const newCustomer: Customer = {
    ...input,
    id: id("cust"),
    visitCount: 0,
    totalSpent: 0,
    grade: "new",
  };
  setState({ ...db, customers: [newCustomer, ...db.customers] });
  return newCustomer;
}

export function updateCustomer(customerId: string, patch: Partial<Customer>) {
  const db = getState();
  setState({
    ...db,
    customers: db.customers.map((c) => (c.id === customerId ? { ...c, ...patch } : c)),
  });
}

export function deleteCustomer(customerId: string) {
  const db = getState();
  setState({
    ...db,
    customers: db.customers.filter((c) => c.id !== customerId),
    reservations: db.reservations.filter((r) => r.customerId !== customerId),
    serviceRecords: db.serviceRecords.filter((r) => r.customerId !== customerId),
  });
}

export function addReservation(input: Omit<Reservation, "id">) {
  const db = getState();
  const rsv: Reservation = { ...input, id: id("rsv") };
  setState({ ...db, reservations: [...db.reservations, rsv] });
  return rsv;
}

export function updateReservation(reservationId: string, patch: Partial<Reservation>) {
  const db = getState();
  setState({
    ...db,
    reservations: db.reservations.map((r) => (r.id === reservationId ? { ...r, ...patch } : r)),
  });
}

export function deleteReservation(reservationId: string) {
  const db = getState();
  setState({ ...db, reservations: db.reservations.filter((r) => r.id !== reservationId) });
}

export function addServiceRecord(input: Omit<ServiceRecord, "id">) {
  const db = getState();
  const record: ServiceRecord = { ...input, id: id("rec") };
  const next = recalcCustomer({ ...db, serviceRecords: [record, ...db.serviceRecords] }, input.customerId);
  setState(next);
  return record;
}

export function deleteServiceRecord(recordId: string, customerId: string) {
  const db = getState();
  const next = recalcCustomer(
    { ...db, serviceRecords: db.serviceRecords.filter((r) => r.id !== recordId) },
    customerId
  );
  setState(next);
}

export function upsertMenuItem(item: ServiceMenuItem) {
  const db = getState();
  const exists = db.menu.some((m) => m.id === item.id);
  setState({
    ...db,
    menu: exists ? db.menu.map((m) => (m.id === item.id ? item : m)) : [...db.menu, item],
  });
}

export function deleteMenuItem(menuId: string) {
  const db = getState();
  setState({ ...db, menu: db.menu.filter((m) => m.id !== menuId) });
}

export function updateShopInfo(patch: Partial<ShopInfo>) {
  const db = getState();
  setState({ ...db, shopInfo: { ...db.shopInfo, ...patch } });
}

export function newId(prefix: string) {
  return id(prefix);
}
