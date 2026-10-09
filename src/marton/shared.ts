import { speakNumbers } from './speech-ko';
// 마트ON 서버/클라이언트 공용 타입과 상수

export const DEPARTMENTS = ['고객센터', '수산', '축산', '농산', '가공', '생활문화', 'MS'] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const DUTIES: Record<Department, string[]> = {
  고객센터: ['안내데스크', '교환/환불', '배송접수', '방송'],
  수산: ['선어/회', '건어물', '냉동수산', '진열'],
  축산: ['정육', '양념육', '가공육', '진열'],
  농산: ['과일', '채소', '양곡', '진열'],
  가공: ['상온가공', '냉장/냉동', '음료/주류', '진열'],
  생활문화: ['생활용품', '주방', '문구/완구', '가전'],
  MS: ['매장관리', '시설', '보안', '주차'],
};

export const TASK_CATEGORIES = ['고객응대 요청', '상품 위치 확인', '가격 오류', '바코드 훼손/미인식', '행사상품 확인', '재고/보충', '기타'] as const;

/** 업무요청에 붙일 수 있는 사진 수 (상품·가격표·바코드 사진) */
export const MAX_TASK_PHOTOS = 3;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_STATUSES = ['접수', '확인', '처리중', '완료'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type Role = 'staff' | 'manager';

export interface Staff {
  id: string; // 사번
  name: string;
  dept: Department;
  duty: string;
  role: Role;
  title?: string; // 점장, 부점장 등
  /** 시니어 담당 / 주니어 담당 (소통 쿠폰 보낼 때 묶음 선택) */
  level?: StaffLevel;
  /** 생년월일 (선택, YYYY-MM-DD 또는 MM-DD) — 그날 생일 축하 */
  birthday?: string;
}

/** 생일(월-일)이 오늘(매장 기준)인지 */
export function isBirthdayToday(birthday: string | undefined, now = Date.now()) {
  const m = /(\d{1,2})-(\d{1,2})$/.exec(birthday ?? '');
  if (!m) return false;
  const t = storeTime(now);
  return Number(m[1]) === t.month && Number(m[2]) === t.date;
}

export const birthdayMessage = (name: string) => `${name} 담당님 생일 축하드립니다`;

// ---- 첨부 파일 (실적 공유) ----
export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
}
export const MAX_FILE_BYTES = 1.8 * 1024 * 1024;

// ---- 매장 소리 (관리자가 올린 파일) ----
export const SOUND_KINDS = ['birthday', 'coupon', 'call'] as const;
export type StoreSoundKind = (typeof SOUND_KINDS)[number];
export const SOUND_LABEL: Record<StoreSoundKind, string> = { birthday: '생일 축하', coupon: '커피쿠폰 도착', call: '부서 호출음' };
export const MAX_SOUND_BYTES = 1.5 * 1024 * 1024;
export interface StoreSound {
  kind: StoreSoundKind;
  id: string;
  name: string;
  size: number;
  uploadedBy: Actor;
  uploadedAt: number;
}

// ---- 월 근무계획 ----
export const SHIFTS = ['1근', '2근', '3근', '휴무', '연차', '반차'] as const;
export interface ShiftEntry {
  date: string; // YYYY-MM-DD
  name: string;
  dept?: Department;
  shift: string; // 1근·2근·3근·휴무·연차·반차 (그 밖의 표기는 그대로)
}
export interface WorkSchedule {
  month: string; // YYYY-MM
  entries: ShiftEntry[];
  fileName?: string;
  uploadedBy: Actor;
  uploadedAt: number;
}

/** 정기휴무: 매월 둘째·넷째 월요일 (YYYY-MM-DD 목록) */
export function regularHolidays(year: number, month: number): string[] {
  const out: string[] = [];
  let mondays = 0;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let d = 1; d <= days; d++) {
    if (new Date(Date.UTC(year, month - 1, d)).getUTCDay() !== 1) continue;
    mondays++;
    if (mondays === 2 || mondays === 4) out.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return out;
}

/** 근무 표기를 1근·2근·3근·휴무·연차·반차로 맞춘다 */
export function normalizeShift(raw: unknown): string | null {
  const v = String(raw ?? '').trim().replace(/\s+/g, '');
  if (!v) return null;
  if (/^(1|1근|①|일근|오픈|A)$/i.test(v)) return '1근';
  if (/^(2|2근|②|이근|중간|B)$/i.test(v)) return '2근';
  if (/^(3|3근|③|삼근|마감|C)$/i.test(v)) return '3근';
  if (/^(휴|휴무|off|x|ㅡ|-|\/|비번|정휴|정기휴무)$/i.test(v)) return '휴무';
  if (/^(연|연차|연가)$/.test(v)) return '연차';
  if (/^(반|반차|오전반차|오후반차)$/.test(v)) return '반차';
  return v.slice(0, 6);
}

// ---- 소비기한 점검 일정 ----
export interface ExpiryCheck {
  id: string;
  at: number; // 점검 시각
  dept: Department;
  area: string; // 구역·품목 (예: 유제품 냉장 쇼케이스)
  assignee?: string; // 담당자 이름
  note?: string;
  createdBy: Actor;
  createdAt: number;
  calledAt?: number;
  doneBy?: Actor;
  doneAt?: number;
}

export const expiryCallPhrase = (c: Pick<ExpiryCheck, 'dept' | 'area' | 'assignee'>) =>
  `${c.dept} 담당님 호출입니다. 소비기한 점검 시간입니다. ${c.area}${c.assignee ? `, 담당 ${c.assignee}` : ''}`;

export const STAFF_LEVELS = ['시니어', '주니어'] as const;
export type StaffLevel = (typeof STAFF_LEVELS)[number];

// ---- 소통 커피쿠폰 ----
// 점장·부점장이 직원에게 보내는 매장 자체 쿠폰. 매장과 약속된 커피 매장에서 화면을 보여 주고 1장에 커피 1잔.
export interface Coupon {
  id: string;
  /** 쿠폰 번호 (예: 1009-0007-03) — 같은 묶음 안에서 순서대로 */
  serial: string;
  /** 묶음 안 순서 (1장부터 차례로 쓰게) */
  no: number;
  total: number;
  batchId: string;
  to: Actor & { level?: StaffLevel };
  from: Actor & { title?: string };
  /** 사용처 (예: 매장 내 이디야커피) */
  place: string;
  item: string;
  message?: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
}

export const COUPON_COUNTS = [1, 5, 10] as const;
export const COUPON_VALID_DAYS = 90;
export const COUPON_ARRIVED = '소통 커피쿠폰이 도착했습니다';

export interface Actor {
  id: string;
  name: string;
  dept: Department;
}

export interface TaskEvent {
  status: TaskStatus;
  by: Actor;
  at: number;
  note?: string;
}

export interface Task {
  id: string;
  category: TaskCategory;
  title: string;
  detail: string;
  location?: string;
  fromDept: Department;
  toDept: Department;
  urgent: boolean;
  status: TaskStatus;
  createdBy: Actor;
  createdAt: number;
  updatedAt: number;
  history: TaskEvent[];
  clientId?: string; // 오프라인 재전송 중복 방지
  photos?: string[]; // 첨부 사진 id (/api/marton/photos/:id)
}

export interface Notice {
  id: string;
  scope: 'all' | Department;
  title: string;
  body: string;
  urgent: boolean;
  by: Actor;
  createdAt: number;
  readBy: string[];
  /** broadcast: 전체 공지 방송, meeting: 금일 중회, order: 점장 지시사항 (모두 호출음과 음성으로 알림) */
  kind?: 'broadcast' | 'meeting' | 'order' | 'share';
  /** 여러 파트에 보낼 때 받는 부서들 (scope는 그 중 첫 부서) */
  depts?: Department[];
  /** 보낸 사람 직책 (점장·부점장) — "점장님 지시사항입니다" */
  byTitle?: string;
  /** 첨부 사진 (실적표 등, 최대 MAX_NOTICE_PHOTOS장) */
  photos?: string[];
  /** 사진마다 붙는 간단한 설명 (AI 요약 또는 직접 입력) */
  photoCaptions?: string[];
  /** 첨부 파일 (엑셀·PDF 등) */
  files?: Attachment[];
  /** 중회 시각 (10분 전에 다시 알림) */
  meetingAt?: number;
}

export const BROADCAST_TITLE = '전체 공지 방송 안내입니다';
export const MAX_NOTICE_PHOTOS = 5;

/** "금일 14시 중회 있습니다", "금일 14시 30분 중회 있습니다" */
export const meetingTitle = (hour: number, minute: number, prefix = '금일') =>
  `${prefix} ${hour}시${minute ? ` ${minute}분` : ''} 중회 있습니다`;

/** 방송·중회 공지를 말로 읽을 문장 (일반 공지는 null) */
export function noticeSpeech(n: Pick<Notice, 'kind' | 'title' | 'body' | 'byTitle'>): string | null {
  if (n.kind === 'broadcast') return `${BROADCAST_TITLE}. ${n.body || ''}`.trim();
  if (n.kind === 'meeting') return `${n.title}.${n.body ? ` ${n.body}` : ''}`;
  if (n.kind === 'share') return `실적 공유가 올라왔습니다. ${n.title}`;
  if (n.kind === 'order') {
    const body = n.body && !n.body.startsWith(n.title) ? ` ${n.body}` : '';
    return `${n.byTitle || '점장'}님 지시사항입니다. ${n.body?.startsWith(n.title) ? n.body : n.title}.${body}`;
  }
  return null;
}

/** 이 공지를 받는 부서인지 */
export const noticeFor = (n: Pick<Notice, 'scope' | 'depts'>, dept: Department) => n.scope === 'all' || n.scope === dept || Boolean(n.depts?.includes(dept));

/** 공지 대상 이름: "전체", "수산", "수산·축산" */
export const noticeTarget = (n: Pick<Notice, 'scope' | 'depts'>) => (n.scope === 'all' ? '전체' : n.depts?.length ? n.depts.join('·') : n.scope);

export interface Product {
  id: string;
  name: string;
  aliases: string[];
  barcode?: string;
  dept: Department;
  floor: string;
  corner: string;
  shelf: string;
  /** 매대 번호 (예: 12 → "12번 매대") */
  bay?: number;
  /** 매대에서 몇 번째 칸 (예: 3 → "3번째 칸") */
  slot?: number;
  price: number;
}

/** 행사 전단 한 줄 (전단 인식 결과이자 행사상품 등록 입력) */
export interface FlyerItem {
  name: string;
  /** 판매코드 (상품코드·바코드 숫자) */
  code?: string;
  /** 규격·단위 (예: 1L, 120g×5입) */
  spec?: string;
  /** 행사 판매가 */
  price?: number;
  originalPrice?: number;
  /** 행사 프로모션 (예: 1+1, 30% 할인, 카드 할인) */
  condition?: string;
  period?: string;
}

export interface Promotion extends FlyerItem {
  id: string;
  /** 매장 상품 DB와 연결된 경우 */
  productId?: string;
  createdAt: number;
  by: Actor;
}

/**
 * 판매코드가 같으면 같은 상품. 코드가 없으면 상품명이 겹치고 규격(1L, 100g 등)도 매장 상품명에 들어 있을 때만 같은 상품으로 본다
 * ("한우 등심 100g" 행사가가 "한우 등심 300g" 가격표 확인에 쓰이지 않게).
 */
export function matchProduct(item: { name: string; code?: string; spec?: string }, products: Product[]): Product | undefined {
  const code = item.code?.replace(/\D/g, '');
  if (code && code.length >= 8) {
    const byCode = products.find(p => p.barcode === code);
    if (byCode) return byCode;
  }
  const n = item.name.replace(/\s+/g, '').toLowerCase();
  if (n.length < 2) return undefined;
  // 규격에서 용량만 (예: "각 500g/냉장/국산" → 500g). 용량이 적혀 있으면 매장 상품명에도 같은 용량이 있어야 한다
  const sizes = (item.spec ?? '').toLowerCase().replace(/\s+/g, '').match(/\d[\d.,]*(kg|g|ml|l|입|매|롤|개|구|봉|팩)/g) ?? [];
  return products.find(p => {
    const k = p.name.replace(/\s+/g, '').toLowerCase();
    const nameHit = k.includes(n) || n.includes(k) || p.aliases.some(a => a.length >= 2 && n.includes(a.replace(/\s+/g, '').toLowerCase()));
    return nameHit && (!sizes.length || sizes.some(sz => k.includes(sz)));
  });
}

export interface Bootstrap {
  me: Staff;
  tasks: Task[];
  notices: Notice[];
  products: Product[];
  promotions: Promotion[];
  incidents: Incident[];
  patrols: PatrolLog[];
  reports: WeeklyReport[];
  handovers: Handover[];
  /** 내 소통 쿠폰 보관함 */
  coupons: Coupon[];
  /** 지난달·이번 달·다음 달 근무계획 */
  schedules: WorkSchedule[];
  /** 소비기한 점검 일정 (지난 7일 ~ 앞으로) */
  expiryChecks: ExpiryCheck[];
  /** 매장에서 바꾼 소리 */
  sounds: StoreSound[];
  online: Record<string, number>;
  aiEnabled: boolean;
}

export type StreamEvent =
  | { type: 'task'; task: Task; action: 'created' | 'updated' }
  | { type: 'notice'; notice: Notice }
  | { type: 'promotion'; promotion: Promotion }
  | { type: 'incident'; incident: Incident; action: 'created' | 'updated' }
  | { type: 'patrol'; patrol: PatrolLog }
  | { type: 'report'; report: WeeklyReport }
  | { type: 'handover'; handover: Handover }
  | { type: 'presence'; online: Record<string, number> }
  | { type: 'coupon'; coupons: Coupon[]; action: 'received' | 'used' }
  | { type: 'schedule'; schedule: WorkSchedule }
  | { type: 'expiry'; checks: ExpiryCheck[]; action: 'saved' | 'deleted' | 'call' }
  | { type: 'birthday'; staffId: string; name: string }
  | { type: 'sounds'; sounds: StoreSound[] };

/** 매장 상품의 현재 행사 (나중에 등록한 행사가 우선) */
export function promotionFor(p: Product, promotions: Promotion[]): Promotion | undefined {
  for (let i = promotions.length - 1; i >= 0; i--) {
    const pr = promotions[i];
    if (pr.productId ? pr.productId === p.id : matchProduct(pr, [p]) === p) return pr;
  }
  return undefined;
}

export interface VisionFlyerResult {
  mode: 'flyer';
  items: (FlyerItem & { productId?: string })[];
}

export interface VisionPriceResult {
  mode: 'price';
  name?: string;
  price?: number;
  matched?: Product;
  promotion?: Promotion;
  verdict: 'ok' | 'mismatch' | 'unknown';
  message: string;
}

export interface VisionBarcodeResult {
  mode: 'barcode';
  barcode?: string;
  guessName?: string;
  matched?: Product;
  message: string;
}

export type VisionResult = VisionFlyerResult | VisionPriceResult | VisionBarcodeResult;

export interface AskResult {
  /** 화면에 보여 줄 안내 */
  answer: string;
  /** 음성으로 읽을 안내 (1+1 → 원 플러스 원, 10/8~10/14 → 10월 8일부터 …) */
  speech?: string;
  products: Product[];
  promotion?: Promotion;
}

export const SEED_PRODUCTS: Product[] = [
  { id: 'p1', name: '완도 활전복 (대) 1kg', aliases: ['전복', '활전복'], barcode: '8801234500011', dept: '수산', floor: 'B1', corner: '수산 활어코너', shelf: '수조 2번', bay: 1, slot: 2, price: 59800 },
  { id: 'p2', name: '노르웨이 생연어 필렛 300g', aliases: ['연어', '생연어'], barcode: '8801234500028', dept: '수산', floor: 'B1', corner: '수산 냉장', shelf: '오픈쇼케이스 3단', bay: 2, slot: 3, price: 15900 },
  { id: 'p3', name: '국산 고등어 2마리', aliases: ['고등어'], barcode: '8801234500035', dept: '수산', floor: 'B1', corner: '선어 매대', shelf: '얼음매대 좌측', bay: 3, slot: 1, price: 7980 },
  { id: 'p17', name: '제주 생갈치 (대) 1마리', aliases: ['갈치', '생갈치', '제주갈치'], barcode: '8801234500189', dept: '수산', floor: 'B1', corner: '선어 매대', shelf: '얼음매대 중앙', bay: 3, slot: 2, price: 6490 },
  { id: 'p18', name: '부산 사각어묵 400g', aliases: ['오뎅', '어묵', '부산어묵', '사각어묵'], barcode: '8801234500196', dept: '가공', floor: 'B1', corner: '냉장 가공', shelf: '어묵·두부 냉장 3단', bay: 12, slot: 3, price: 3980 },
  { id: 'p4', name: '한우 1++ 등심 300g', aliases: ['한우', '등심', '소고기'], barcode: '8801234500042', dept: '축산', floor: 'B1', corner: '정육 한우', shelf: '냉장 쇼케이스 1번', bay: 5, slot: 1, price: 42000 },
  { id: 'p5', name: '국내산 삼겹살 500g', aliases: ['삼겹살', '돼지고기'], barcode: '8801234500059', dept: '축산', floor: 'B1', corner: '정육 돈육', shelf: '냉장 쇼케이스 4번', bay: 6, slot: 4, price: 13900 },
  { id: 'p6', name: '양념 LA갈비 1kg', aliases: ['LA갈비', 'la갈비'], barcode: '8801234500066', dept: '축산', floor: 'B1', corner: '양념육', shelf: '냉장 평대', bay: 7, slot: 1, price: 29900 },
  { id: 'p7', name: '청송 꿀사과 1.5kg', aliases: ['사과'], barcode: '8801234500073', dept: '농산', floor: 'B1', corner: '과일 메인 평대', shelf: '입구 앞 평대', bay: 8, slot: 1, price: 12900 },
  { id: 'p8', name: '친환경 대파 1단', aliases: ['대파', '파'], barcode: '8801234500080', dept: '농산', floor: 'B1', corner: '채소 냉장', shelf: '다단 냉장 2단', bay: 9, slot: 2, price: 3480 },
  { id: 'p9', name: '신라면 5입', aliases: ['라면', '신라면'], barcode: '8801043014809', dept: '가공', floor: 'B1', corner: '라면/면류', shelf: '7번 통로 좌측 3단', bay: 17, slot: 3, price: 4480 },
  { id: 'p10', name: '서울우유 1L', aliases: ['우유'], barcode: '8801115114154', dept: '가공', floor: 'B1', corner: '유제품 냉장', shelf: '워크인 냉장 2번 도어', bay: 11, slot: 2, price: 2980 },
  { id: 'p11', name: '햇반 210g 12입', aliases: ['햇반', '즉석밥'], barcode: '8801007160337', dept: '가공', floor: 'B1', corner: '즉석식품', shelf: '5번 통로 우측 2단', bay: 15, slot: 2, price: 13980 },
  { id: 'p12', name: '카스 500ml 6캔', aliases: ['맥주', '카스'], barcode: '8801021230113', dept: '가공', floor: 'B1', corner: '주류', shelf: '10번 통로 엔드', bay: 20, slot: 1, price: 11800 },
  { id: 'p13', name: '퐁퐁 주방세제 1.2L', aliases: ['주방세제', '세제'], barcode: '8801046290118', dept: '생활문화', floor: '1F', corner: '주방세제', shelf: '15번 통로 좌측 2단', bay: 25, slot: 2, price: 5980 },
  { id: 'p14', name: '깨끗한나라 화장지 30롤', aliases: ['화장지', '휴지'], barcode: '8801166030113', dept: '생활문화', floor: '1F', corner: '제지류', shelf: '18번 통로 하단 파렛트', bay: 28, slot: 1, price: 17900 },
  { id: 'p15', name: '스테인리스 프라이팬 28cm', aliases: ['프라이팬', '후라이팬'], barcode: '8801234500165', dept: '생활문화', floor: '1F', corner: '주방용품', shelf: '20번 통로 우측 4단', bay: 30, slot: 4, price: 34900 },
  { id: 'p16', name: '건전지 AA 10입', aliases: ['건전지', '배터리'], barcode: '8801234500172', dept: '생활문화', floor: '1F', corner: '계산대 앞', shelf: '계산대 3번 앞 걸이', price: 6900 },
];

const FLOOR_SPEECH: Record<string, string> = { B1: '지하 1층', B2: '지하 2층', '1F': '1층', '2F': '2층', '3F': '3층' };
export const floorText = (f: string) => FLOOR_SPEECH[f] ?? f;

/** 매대 위치 짧게: "12번 매대 3번째 칸" (매대 번호가 없으면 진열 위치 글) */
export const bayText = (p: Product) => (p.bay ? `${p.bay}번 매대${p.slot ? ` ${p.slot === 1 ? '첫 번째' : `${p.slot}번째`} 칸` : ''}` : p.shelf);

/** 위치 전체: "B1 냉장 가공 · 12번 매대 3번째 칸" */
export const locationText = (p: Product) => `${p.floor} ${p.corner} · ${bayText(p)}`;

/** 받침이 있으면 a(은/이), 없으면 b(는/가) */
export function josa(word: string, a: string, b: string) {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  // 숫자는 읽는 소리로: 영·일·삼·육·칠·팔(받침 있음) / 이·사·오·구(받침 없음)
  if (/[0-9]/.test(last)) return '013678'.includes(last) ? a : b;
  if (code < 0 || code > 11171) return /[LlMmNnRr]$/.test(last) ? a : b; // 영문은 대략
  return code % 28 ? a : b;
}

// 고객 질문에서 상품 이름만 남긴다 ("오뎅은 어디로 가면 살 수 있어요?" → ["오뎅"])
const QUESTION_NOISE = /(어디로\s*가면|어디에\s*가면|어디\s*있|어디|위치|살\s*수\s*있|살수있|사려면|팔아요|파나요|파는|찾아\s*줘|찾아|알려\s*줘|알려|있어요|있나요|있어|있니|얼마예요|얼마에요|얼마야|얼마|가격|이번\s*주|이번주|금주|전단지?|행사|할인|세일|하나요|해요|해|돼요|되나요|인가요|에요|예요|이에요|요|\?|!|\.)/g;
const PARTICLE = /(은|는|이|가|을|를|도|좀|로|으로|에서|에)$/;
export function questionKeywords(question: string): string[] {
  return question.replace(QUESTION_NOISE, ' ').split(/\s+/)
    .map(w => w.replace(PARTICLE, '').replace(/[^0-9A-Za-z가-힣+]/g, ''))
    .filter(w => w.length >= 2 || /^[가-힣]$/.test(w) && !/^(어|거|것|그|저|좀|제|뭐|님|요|게|걸)$/.test(w))
    .filter(w => !/^(고객|손님|어디|어디에|여기|거기)$/.test(w));
}

/** 가격·행사를 묻는 질문인지 */
export const asksPrice = (q: string) => /(얼마|가격|행사|할인|세일|전단|싸|1\+1|원이)/.test(q);

/** "10/8~10/14" → "10월 8일부터 10월 14일까지" (음성으로 읽기 좋게) */
export function periodSpeech(period?: string) {
  if (!period) return '';
  const m = /(\d{1,2})[./](\d{1,2})[^~]*~\s*(?:(\d{1,2})[./])?(\d{1,2})/.exec(period);
  if (!m) return period;
  return `${m[1]}월 ${m[2]}일부터 ${m[3] ?? m[1]}월 ${m[4]}일까지`;
}


// ---- 보안/손실방지 ----
// 원칙: 사람(인상착의·신원)이 아니라 상황·위치·시간·상품을 기록한다.

export const INCIDENT_TYPES = ['의심 상황', '도난 확인', '빈 포장/훼손', '보안태그 제거 흔적', '계산 누락 의심', '센서 경보'] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_STATUSES = ['접수', '확인', '대응중', '종결'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_OUTCOMES = ['도난 확인', '사후 발견 손실', '상품 회수', '오인/정상 구매', '기타'] as const;
export type IncidentOutcome = (typeof INCIDENT_OUTCOMES)[number];
export const LOSS_OUTCOMES: IncidentOutcome[] = ['도난 확인', '사후 발견 손실'];

/** 보안 구역과 해당 구역을 맡은 부서 (알림 대상) */
export const SECURITY_ZONES: { zone: string; dept: Department }[] = [
  { zone: '출입구/EAS 게이트', dept: 'MS' },
  { zone: '셀프계산대', dept: '고객센터' },
  { zone: '계산대', dept: '고객센터' },
  { zone: '주류', dept: '가공' },
  { zone: '건강기능식품', dept: '가공' },
  { zone: '정육 쇼케이스', dept: '축산' },
  { zone: '수산 냉장', dept: '수산' },
  { zone: '과일/농산', dept: '농산' },
  { zone: '화장품/생활', dept: '생활문화' },
  { zone: '가전/디지털', dept: '생활문화' },
  { zone: '하역장/창고', dept: 'MS' },
];
export const zoneDept = (zone: string): Department => SECURITY_ZONES.find(z => z.zone === zone)?.dept ?? 'MS';

export interface IncidentEvent {
  status: IncidentStatus;
  by: Actor;
  at: number;
  note?: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  source: 'staff' | 'sensor';
  urgent: boolean; // 현재 진행 중인 상황
  zone: string;
  dept: Department;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  estimatedLoss: number;
  cctvRef?: string; // 카메라 번호/시각 (영상은 CCTV 시스템에만 보관)
  note: string;
  sensorId?: string;
  test?: boolean; // 연동 테스트 — 분석에서 제외
  status: IncidentStatus;
  outcome?: IncidentOutcome;
  occurredAt: number;
  createdAt: number;
  updatedAt: number;
  reportedBy: Actor;
  history: IncidentEvent[];
  clientId?: string;
}

/** 보안 신고를 볼 수 있는 사람: 관리자, MS(보안), 신고자 본인, 해당 구역 부서(진행 중 알림용) */
export const canSeeIncident = (s: Staff, i: Incident) =>
  s.role === 'manager' || s.dept === 'MS' || i.reportedBy.id === s.id || (i.dept === s.dept && i.status !== '종결');
export const canHandleIncident = (s: Staff) => s.role === 'manager' || s.dept === 'MS';

export interface LossInsight {
  summary: string;
  actions: string[];
  source: 'ai' | 'rules';
}

// ---- 매장 시간대 ----
// 서버가 UTC(클라우드)에서 돌아도 날짜·요일·시간대 계산은 매장 기준(한국 UTC+9, 서머타임 없음)으로 한다.
let storeOffsetMin = 540;
export function setStoreUtcOffset(minutes: number) {
  if (Number.isFinite(minutes)) storeOffsetMin = minutes;
}

/** 매장 기준 오늘 0시 (UTC 밀리초) */
export function storeDayStart(t: number) {
  const day = 86400000;
  return Math.floor((t + storeOffsetMin * 60000) / day) * day - storeOffsetMin * 60000;
}

/** 매장 기준 연·월·일·요일·시 */
export function storeTime(t: number) {
  const d = new Date(t + storeOffsetMin * 60000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, date: d.getUTCDate(), day: d.getUTCDay(), hour: d.getUTCHours() };
}

export interface LossStats {
  total: number;
  confirmed: number;
  falseAlarm: number;
  open: number;
  loss: number;
  avgAckMs: number | null;
  byZone: [string, number][];
  byHour: number[]; // 0~23시
  byWeekday: number[]; // 일~토
  byProduct: [string, number][]; // 손실액 기준
  byType: [string, number][];
}

const countBy = (keys: string[]) => {
  const m = new Map<string, number>();
  keys.forEach(k => m.set(k, (m.get(k) || 0) + 1));
  return [...m].sort((a, b) => b[1] - a[1]);
};

/** 손실방지 분석 집계 (테스트 경보 제외). 서버 AI 분석과 점장 화면이 같이 쓴다. */
export function lossStats(incidents: Incident[], since: number, until = Infinity): LossStats {
  const list = incidents.filter(i => !i.test && i.occurredAt >= since && i.occurredAt < until);
  const closed = list.filter(i => i.outcome);
  const lossList = list.filter(i => i.outcome && LOSS_OUTCOMES.includes(i.outcome));
  const acks = list.map(i => (i.history.find(h => h.status === '확인')?.at ?? 0) - i.createdAt).filter(x => x > 0);
  const byHour = Array(24).fill(0);
  const byWeekday = Array(7).fill(0);
  list.forEach(i => { const d = storeTime(i.occurredAt); byHour[d.hour]++; byWeekday[d.day]++; });
  const productLoss = new Map<string, number>();
  lossList.forEach(i => i.productName && productLoss.set(i.productName, (productLoss.get(i.productName) || 0) + i.estimatedLoss));
  return {
    total: list.length,
    confirmed: lossList.length,
    falseAlarm: closed.filter(i => i.outcome === '오인/정상 구매').length,
    open: list.filter(i => i.status !== '종결').length,
    loss: lossList.reduce((a, i) => a + i.estimatedLoss, 0),
    avgAckMs: acks.length ? acks.reduce((a, b) => a + b, 0) / acks.length : null,
    byZone: countBy(list.map(i => i.zone)),
    byHour,
    byWeekday,
    byProduct: [...productLoss].sort((a, b) => b[1] - a[1]),
    byType: countBy(list.map(i => i.type)),
  };
}

// ---- 순찰 추천 ----

export interface PatrolLog {
  id: string;
  date: string; // YYYY-MM-DD (매장 현지)
  hour: number;
  zone: string;
  by: Actor;
  at: number;
  note?: string;
}

export interface PatrolSlot {
  hour: number;
  label: string; // 피크 18시 → "17:30~18:30"
  zones: { zone: string; count: number; reason: string }[];
}

export const dayKey = (t: number) => {
  const d = storeTime(t);
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.date).padStart(2, '0')}`;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 최근 4주 신고로 오늘 순찰 시간대와 구역을 추천한다.
 * 같은 요일·실제 손실 건에 가중치를 주고, 피크 30분 전부터 순찰하도록 잡는다.
 */
export function patrolPlan(incidents: Incident[], now = Date.now(), maxSlots = 4): PatrolSlot[] {
  const today = storeTime(now).day;
  const score = new Map<string, { hour: number; zone: string; score: number; count: number }>();
  for (const i of incidents) {
    if (i.test || i.occurredAt < now - 28 * DAY_MS || i.occurredAt > now) continue;
    const d = storeTime(i.occurredAt);
    const key = `${d.hour}|${i.zone}`;
    const w = 1 + (d.day === today ? 1 : 0) + (i.outcome && LOSS_OUTCOMES.includes(i.outcome) ? 1 : 0) - (i.outcome === '오인/정상 구매' ? 0.5 : 0);
    const cur = score.get(key) ?? { hour: d.hour, zone: i.zone, score: 0, count: 0 };
    cur.score += w;
    cur.count += 1;
    score.set(key, cur);
  }
  const byHour = new Map<number, { zone: string; score: number; count: number }[]>();
  for (const v of score.values()) byHour.set(v.hour, [...(byHour.get(v.hour) ?? []), v]);
  const hourScore = (h: number) => (byHour.get(h) ?? []).reduce((a, z) => a + z.score, 0);
  return [...byHour.keys()]
    .sort((a, b) => hourScore(b) - hourScore(a))
    .slice(0, maxSlots)
    .sort((a, b) => a - b)
    .map(hour => {
      // 피크 시간대 30분 전 ~ 30분 후 (연속된 슬롯끼리 겹치지 않음)
      const hhmm = (m: number) => `${String(Math.floor(((m + 1440) % 1440) / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
      return {
        hour,
        label: `${hhmm(hour * 60 - 30)}~${hhmm(hour * 60 + 30)}`,
        zones: (byHour.get(hour) ?? []).sort((a, b) => b.score - a.score).slice(0, 3)
          .map(z => ({ zone: z.zone, count: z.count, reason: `최근 4주 ${hour}시대 ${z.count}건` })),
      };
    });
}

// ---- 주간 손실 리포트 ----

export interface WeeklyReport {
  id: string;
  weekStart: number;
  weekEnd: number;
  createdAt: number;
  auto: boolean;
  text: string;
}

/** 해당 시각이 속한 주의 월요일 00:00 */
export function weekStartOf(t: number) {
  const d = storeTime(t);
  const midnight = Date.UTC(d.year, d.month - 1, d.date) - storeOffsetMin * 60000;
  return midnight - ((d.day + 6) % 7) * DAY_MS;
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const diff = (cur: number, prev: number, unit = '') => {
  if (!prev) return cur ? '(지난주 0)' : '';
  const d = cur - prev;
  return d === 0 ? '(지난주와 동일)' : `(지난주 대비 ${d > 0 ? '+' : ''}${d.toLocaleString()}${unit}, ${d > 0 ? '+' : ''}${pct(d, prev)}%)`;
};
const mins = (ms: number | null) => (ms === null ? '-' : ms < 60000 ? `${Math.round(ms / 1000)}초` : `${Math.round(ms / 60000)}분`);
const fmtDate = (t: number) => { const d = storeTime(t); return `${d.month}/${d.date}(${WEEKDAYS[d.day]})`; };

/** 점장 보고·사내 메신저에 붙여 넣을 수 있는 텍스트 리포트 */
export function buildWeeklyReport(incidents: Incident[], patrols: PatrolLog[], weekStart: number, weekEnd: number, actions: string[]): string {
  const cur = lossStats(incidents, weekStart, weekEnd);
  const prev = lossStats(incidents, weekStart - 7 * DAY_MS, weekStart);
  const closed = cur.confirmed + cur.falseAlarm;
  const weekPatrols = patrols.filter(p => p.at >= weekStart && p.at < weekEnd);
  const topHours = cur.byHour.map((n, h) => [h, n] as const).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const lines = [
    `[마트ON 주간 손실방지 리포트] ${fmtDate(weekStart)} ~ ${fmtDate(weekEnd - 1)}`,
    '',
    '■ 요약',
    `- 보안 신고 ${cur.total}건 ${diff(cur.total, prev.total, '건')}`,
    `- 손실 확인 ${cur.confirmed}건 / 추정 손실액 ${cur.loss.toLocaleString()}원 ${diff(cur.loss, prev.loss, '원')}`,
    `- 오인 비율 ${closed ? pct(cur.falseAlarm, closed) : 0}% · 평균 확인 시간 ${mins(cur.avgAckMs)} · 미종결 ${cur.open}건`,
    `- 순찰 완료 기록 ${weekPatrols.length}회`,
    '',
    '■ 다발 구역',
    ...(cur.byZone.length ? cur.byZone.slice(0, 3).map(([z, n], k) => `${k + 1}. ${z} ${n}건`) : ['- 없음']),
    '',
    '■ 다발 시간대',
    ...(topHours.length ? topHours.map(([h, n]) => `- ${h}시대 ${n}건`) : ['- 없음']),
    '',
    '■ 손실 상품',
    ...(cur.byProduct.length ? cur.byProduct.slice(0, 5).map(([p, w]) => `- ${p} ${w.toLocaleString()}원`) : ['- 없음']),
    '',
    '■ 다음 주 조치 제안',
    ...(actions.length ? actions.map(a => `- ${a}`) : ['- 특이사항 없음']),
  ];
  return lines.join('\n');
}

// ---- 음성 요청 ("수산에 고객응대 요청해줘, 고객센터 앞, 급해") ----

export interface ParsedRequest {
  toDept?: Department;
  category?: TaskCategory;
  location?: string;
  urgent: boolean;
  product?: Product;
  title: string;
  detail: string;
  complete: boolean; // 부서와 유형을 모두 알아냈는지
}

const DEPT_WORDS: [Department, string[]][] = [
  ['수산', ['수산', '생선', '회코너', '횟감', '활어', '수산코너']],
  ['축산', ['축산', '정육', '고기', '한우', '돼지고기', '정육코너']],
  ['농산', ['농산', '과일', '채소', '야채', '청과']],
  ['가공', ['가공', '공산', '가공식품', '음료', '주류', '라면']],
  ['생활문화', ['생활문화', '생활용품', '생활', '주방용품', '가전', '문구', '완구']],
  ['MS', ['MS', '엠에스', '보안', '시설', '매장관리', '주차']],
  ['고객센터', ['고객센터', '안내데스크', '안내 데스크', '고객만족센터']],
];

const CATEGORY_WORDS: [TaskCategory, string[]][] = [
  ['가격 오류', ['가격 오류', '가격오류', '가격표', '가격이 틀', '가격 틀', '가격이 달', '금액이 틀', '금액이 달', '가격 확인']],
  ['행사상품 확인', ['행사', '1+1', '원플러스원', '할인', '증정', '세일']],
  ['재고/보충', ['재고', '보충', '품절', '비었', '비어', '채워', '진열 부족', '물건 없']],
  ['바코드 훼손/미인식', ['바코드', '안 찍', '안찍', '인식 안', '인식이 안', '스캔 안', '스캔이 안']],
  ['상품 위치 확인', ['어디', '위치', '찾아', '못 찾', '못찾']],
  ['고객응대 요청', ['응대', '손님', '고객님', '고객 문의', '문의', '와 주', '와주', '불러', '와줘', '와달', '도와']],
];

const URGENT_WORDS = ['긴급', '급해', '급한', '급히', '빨리', '당장', '지금 바로', '바로 와', '시급'];
const LOCATION_RE = new RegExp([
  '\\d+\\s*번\\s*(?:계산대|통로|매대|코너|게이트|출입구)',
  '(?:셀프\\s*)?계산대\\s*\\d+\\s*번',
  // 부서 이름이기도 한 장소는 "앞/옆/쪽/근처"가 붙을 때만 위치로 본다
  '(?:고객센터|안내데스크)\\s*(?:앞|옆|쪽|근처)',
  '(?:입구|출입구|정문|후문|엘리베이터|에스컬레이터|무빙워크|주차장|카트\\s*보관소|[가-힣]+코너)\\s*(?:앞|옆|쪽|근처)?',
].map(p => `(?:${p})`).join('|'));

const squash = (s: string) => s.replace(/\s+/g, '');

/** 말한 문장을 업무요청으로 해석한다 (규칙 기반, 기기 안에서 즉시 동작) */
export function parseRequestText(input: string, products: Product[] = []): ParsedRequest {
  const text = input.trim();
  let rest = text;

  // 위치를 먼저 떼어낸다 ("고객센터 앞"의 고객센터를 받는 부서로 오인하지 않도록)
  const loc = LOCATION_RE.exec(rest);
  const location = loc ? loc[0].replace(/\s+/g, ' ').trim() : undefined;
  if (loc) rest = rest.replace(loc[0], ' ');

  // "수산에", "정육으로", "축산팀" 처럼 조사가 붙은 부서를 우선
  let toDept: Department | undefined;
  let firstAt = Infinity;
  for (const [dept, words] of DEPT_WORDS) {
    for (const w of words) {
      const m = new RegExp(`${w}\\s*(에게|에|으로|로|팀|파트|쪽)`).exec(rest);
      if (m && m.index < firstAt) { firstAt = m.index; toDept = dept; }
    }
  }
  if (!toDept) {
    for (const [dept, words] of DEPT_WORDS) {
      for (const w of words) {
        const i = rest.indexOf(w);
        if (i >= 0 && i < firstAt) { firstAt = i; toDept = dept; }
      }
    }
  }

  let category: TaskCategory | undefined;
  for (const [c, words] of CATEGORY_WORDS) {
    if (words.some(w => squash(rest).includes(squash(w)))) { category = c; break; }
  }

  // 상품명이 나오면 해당 부서를 추정
  const flat = squash(text).toLowerCase();
  const product = products.find(p => [p.name, ...p.aliases].some(n => n.length >= 2 && flat.includes(squash(n).toLowerCase())));
  if (!toDept && product) toDept = product.dept;
  if (!category && toDept) category = product ? '상품 위치 확인' : '고객응대 요청';

  const urgent = URGENT_WORDS.some(w => squash(text).includes(squash(w)));
  const title = [toDept, product?.name, category].filter(Boolean).join(' ') || text.slice(0, 40);
  return { toDept, category, location, urgent, product, title: title.slice(0, 60), detail: `🎤 "${text}"`, complete: Boolean(toDept && category) };
}

// ---- 근무 교대 인수인계 ----

export interface Handover {
  id: string;
  dept: Department;
  from: Actor;
  createdAt: number;
  note: string;
  openTasks: { id: string; title: string; status: TaskStatus; urgent: boolean; fromDept: Department }[];
  openIncidents: { id: string; zone: string; type: IncidentType; status: IncidentStatus }[];
  ackBy: { id: string; name: string; at: number }[];
  clientId?: string;
}

export const HANDOVER_CHIPS = ['특이사항 없음', '진열 보충 필요', '냉장·냉동 온도 확인', '행사 POP 교체 필요', '고객 클레임 진행 중', '발주 확인 필요'];

// ---- 고객 질문 안내 ("오뎅 어디 있어요?", "이번 주 갈치 얼마야?") ----

function scoreProducts(words: string[], products: Product[]) {
  return products.map(p => {
    const names = [p.name, ...p.aliases].map(n => n.replace(/\s+/g, '').toLowerCase());
    let score = 0;
    let hit: string | undefined;
    for (const w of words.map(x => x.toLowerCase())) {
      for (const n of names) {
        const s = n === w ? 50 : w.length >= 2 && n.includes(w) ? 30 : n.length >= 2 && w.includes(n) ? 20 : 0;
        if (s > score) { score = s; hit = w; }
      }
    }
    return { p, score, hit };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
}

const sizeOf = (spec?: string) => {
  const first = spec?.split('/')[0].replace(/^각\s*/, '').trim();
  return first && /\d/.test(first) ? first : undefined; // "마리"·"팩"처럼 숫자 없는 건 규격으로 안 씀
};
/** 괄호를 뺀 낱말 기준으로 조사를 붙인다: "감귤(2kg)" → "감귤(2kg)은", "할인 (카드 제외)" → "할인이에요 (카드 제외)" */
const plain = (t: string) => t.replace(/\s*\([^)]*\)\s*$/g, '').replace(/\([^)]*\)/g, '').trim();
const topic = (t: string) => `${t}${josa(plain(t), '은', '는')}`;
function copula(t: string) {
  const tail = /\s*(\([^)]*\))\s*$/.exec(t);
  const main = tail ? t.slice(0, tail.index) : t;
  return `${main}${josa(main, '이에요', '예요')}${tail ? ` ${tail[1]}` : ''}`;
}
/** 음성 안내 문장: 1+1·L.POINT·날짜·층을 풀어 쓴다 (숫자 발음은 speech) */
const say = (t: string) => t
  .replace(/(\d)\+(\d)/g, (_, a, b) => `${'영원투쓰리포'[+a] ?? a} 플러스 ${'영원투쓰리포'[+b] ?? b}`)
  .replace(/L\.POINT/gi, '엘포인트')
  .replace(/(\d{1,2})[./](\d{1,2})\s*~\s*(?:(\d{1,2})[./])?(\d{1,2})/g, (_, m1, d1, m2, d2) => `${m1}월 ${d1}일부터 ${m2 ?? m1}월 ${d2}일까지`)
  .replace(/\bB(\d)\b/g, '지하 $1층').replace(/\b(\d)F\b/g, '$1층')
  .replace(/\s*\(([^)]*)\)/g, ' $1 ')
  .replace(/\s+(은|는|이에요|예요)(?=[\s.,])/g, '$1')
  .replace(/\s+([.,])/g, '$1')
  .replace(/\s{2,}/g, ' ')
  .replace(/\s*·\s*/g, ', ')
  .replace(/([가-힣A-Za-z])\/(?=[가-힣A-Za-z])/g, '$1, ')
  .replace(/까지이에요/g, '까지예요');
export const speech = (t: string) => speakNumbers(say(t));

/**
 * 고객 질문에 매장 데이터만으로 답한다. 찾지 못하면 null (서버가 AI에 넘긴다).
 * 위치 질문 → "오뎅은 B1 냉장 가공, 12번 매대 3번째 칸에 있어요."
 * 가격 질문 → 이번 주 행사가·행사 프로모션·기간 안내
 */
export function answerQuestion(question: string, products: Product[], promotions: Promotion[]): AskResult | null {
  const words = questionKeywords(question);
  if (!words.length) return null;
  const ranked = scoreProducts(words, products);
  let product = ranked[0]?.p;
  const nameWords = words.filter(w => w.length >= 2);
  const linked = product && promotionFor(product, promotions);
  const promo = linked ?? [...promotions].reverse().find(pr => nameWords.some(w => pr.name.replace(/\s+/g, '').includes(w)));
  // "유기농우유" 행사인데 "우유"로만 걸린 다른 상품(서울우유 1L)의 위치를 말하지 않게
  if (product && promo && !linked && ranked[0].score < 50) product = undefined;
  if (!product && !promo) return null;

  const subject = ranked[0]?.hit && product && product.aliases.includes(ranked[0].hit) ? ranked[0].hit : product?.name ?? promo!.name;

  const where = product ? `${product.floor} ${product.corner}, ${bayText(product)}` : '';
  const promoName = promo ? `${promo.name}${sizeOf(promo.spec) ? `(${sizeOf(promo.spec)})` : ''}` : '';
  const promoLine = promo ? [
    promo.price ? `행사가 ${promo.price.toLocaleString()}원${promo.originalPrice && promo.originalPrice > promo.price ? `(정상가 ${promo.originalPrice.toLocaleString()}원)` : ''}` : '',
    promo.condition ?? '',
  ].filter(Boolean).join(', ') : '';
  const periodLine = promo?.period ? ` 행사 기간은 ${copula(promo.period)}.` : '';

  let answer: string;
  if (asksPrice(question)) {
    if (promo) {
      answer = `이번 주 ${topic(promoName)} 전단 행사 상품이에요. ${copula(promoLine)}.${periodLine}`;
      if (product) answer += ` ${topic(subject)} ${where}에 있어요.`;
      else answer += ' 진열 위치는 상품 목록에 없어 담당 부서에 확인해 주세요.';
    } else {
      answer = `${topic(subject)} ${product!.price.toLocaleString()}원이에요. 이번 주 전단 행사 상품은 아니에요. ${where}에 있어요.`;
    }
  } else if (product) {
    answer = `${topic(subject)} ${where}에 있어요.`;
    if (promo) answer += ` 이번 주 행사 상품이에요. ${copula(promoLine)}.${periodLine}`;
  } else {
    answer = `${topic(promoName)} 이번 주 전단 행사 상품이에요. ${copula(promoLine)}.${periodLine} 진열 위치는 상품 목록에 없어 담당 부서에 확인해 주세요.`;
  }
  answer = answer.replace(/\.\./g, '.').replace(/\s+/g, ' ').trim();
  return { answer, speech: speech(answer), products: ranked.slice(0, 5).map(r => r.p), promotion: promo };
}
