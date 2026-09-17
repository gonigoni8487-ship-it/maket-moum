export type CustomerGrade = "new" | "regular" | "vip";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  gender: "여성" | "남성" | "기타";
  birthday: string; // "MM-DD"
  firstVisit: string; // ISO date
  lastVisit: string; // ISO date
  visitCount: number;
  totalSpent: number;
  grade: CustomerGrade;
  tags: string[];
  allergies: string;
  memo: string;
}

export type MenuCategory = "컷" | "펌" | "염색" | "클리닉" | "스타일링" | "기타";

export interface ServiceMenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  durationMin: number;
}

export interface ServiceRecord {
  id: string;
  customerId: string;
  date: string; // ISO date
  menuItemIds: string[];
  price: number;
  formula: string;
  stylistNote: string;
}

export type ReservationStatus = "예약" | "완료" | "노쇼" | "취소";

export interface Reservation {
  id: string;
  customerId: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  durationMin: number;
  menuItemIds: string[];
  status: ReservationStatus;
  memo: string;
}

export interface ShopInfo {
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  openTime: string;
  closeTime: string;
  closedDays: string[];
  revisitCycleDays: number;
}

export interface SalonDB {
  customers: Customer[];
  reservations: Reservation[];
  serviceRecords: ServiceRecord[];
  menu: ServiceMenuItem[];
  shopInfo: ShopInfo;
}

export interface StyleRecommendation {
  title: string;
  description: string;
  whyItFits: string;
}

export interface StyleRecommendationResponse {
  recommendations: StyleRecommendation[];
}

export interface ReminderMessageResponse {
  message: string;
}
