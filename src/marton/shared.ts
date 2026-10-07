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

export const TASK_CATEGORIES = ['고객응대 요청', '상품 위치 확인', '가격 오류', '행사상품 확인', '재고/보충', '기타'] as const;
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
}

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
}

export interface Product {
  id: string;
  name: string;
  aliases: string[];
  barcode?: string;
  dept: Department;
  floor: string;
  corner: string;
  shelf: string;
  price: number;
}

export interface Promotion {
  id: string;
  name: string;
  price?: number;
  originalPrice?: number;
  period?: string;
  condition?: string;
  createdAt: number;
  by: Actor;
}

export interface Bootstrap {
  me: Staff;
  tasks: Task[];
  notices: Notice[];
  products: Product[];
  promotions: Promotion[];
  online: Record<string, number>;
  aiEnabled: boolean;
}

export type StreamEvent =
  | { type: 'task'; task: Task; action: 'created' | 'updated' }
  | { type: 'notice'; notice: Notice }
  | { type: 'promotion'; promotion: Promotion }
  | { type: 'presence'; online: Record<string, number> };

export interface VisionFlyerResult {
  mode: 'flyer';
  items: { name: string; price?: number; originalPrice?: number; period?: string; condition?: string }[];
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
  answer: string;
  products: Product[];
}

export const SEED_PRODUCTS: Product[] = [
  { id: 'p1', name: '완도 활전복 (대) 1kg', aliases: ['전복', '활전복'], barcode: '8801234500011', dept: '수산', floor: 'B1', corner: '수산 활어코너', shelf: '수조 2번', price: 59800 },
  { id: 'p2', name: '노르웨이 생연어 필렛 300g', aliases: ['연어', '생연어'], barcode: '8801234500028', dept: '수산', floor: 'B1', corner: '수산 냉장', shelf: '오픈쇼케이스 3단', price: 15900 },
  { id: 'p3', name: '국산 고등어 2마리', aliases: ['고등어'], barcode: '8801234500035', dept: '수산', floor: 'B1', corner: '선어 매대', shelf: '얼음매대 좌측', price: 7980 },
  { id: 'p4', name: '한우 1++ 등심 300g', aliases: ['한우', '등심', '소고기'], barcode: '8801234500042', dept: '축산', floor: 'B1', corner: '정육 한우', shelf: '냉장 쇼케이스 1번', price: 42000 },
  { id: 'p5', name: '국내산 삼겹살 500g', aliases: ['삼겹살', '돼지고기'], barcode: '8801234500059', dept: '축산', floor: 'B1', corner: '정육 돈육', shelf: '냉장 쇼케이스 4번', price: 13900 },
  { id: 'p6', name: '양념 LA갈비 1kg', aliases: ['LA갈비', '갈비'], barcode: '8801234500066', dept: '축산', floor: 'B1', corner: '양념육', shelf: '냉장 평대', price: 29900 },
  { id: 'p7', name: '청송 꿀사과 1.5kg', aliases: ['사과'], barcode: '8801234500073', dept: '농산', floor: 'B1', corner: '과일 메인 평대', shelf: '입구 앞 평대', price: 12900 },
  { id: 'p8', name: '친환경 대파 1단', aliases: ['대파', '파'], barcode: '8801234500080', dept: '농산', floor: 'B1', corner: '채소 냉장', shelf: '다단 냉장 2단', price: 3480 },
  { id: 'p9', name: '신라면 5입', aliases: ['라면', '신라면'], barcode: '8801043014809', dept: '가공', floor: 'B1', corner: '라면/면류', shelf: '7번 통로 좌측 3단', price: 4480 },
  { id: 'p10', name: '서울우유 1L', aliases: ['우유'], barcode: '8801115114154', dept: '가공', floor: 'B1', corner: '유제품 냉장', shelf: '워크인 냉장 2번 도어', price: 2980 },
  { id: 'p11', name: '햇반 210g 12입', aliases: ['햇반', '즉석밥'], barcode: '8801007160337', dept: '가공', floor: 'B1', corner: '즉석식품', shelf: '5번 통로 우측 2단', price: 13980 },
  { id: 'p12', name: '카스 500ml 6캔', aliases: ['맥주', '카스'], barcode: '8801021230113', dept: '가공', floor: 'B1', corner: '주류', shelf: '10번 통로 엔드', price: 11800 },
  { id: 'p13', name: '퐁퐁 주방세제 1.2L', aliases: ['주방세제', '세제'], barcode: '8801046290118', dept: '생활문화', floor: '1F', corner: '주방세제', shelf: '15번 통로 좌측 2단', price: 5980 },
  { id: 'p14', name: '깨끗한나라 화장지 30롤', aliases: ['화장지', '휴지'], barcode: '8801166030113', dept: '생활문화', floor: '1F', corner: '제지류', shelf: '18번 통로 하단 파렛트', price: 17900 },
  { id: 'p15', name: '스테인리스 프라이팬 28cm', aliases: ['프라이팬', '후라이팬'], barcode: '8801234500165', dept: '생활문화', floor: '1F', corner: '주방용품', shelf: '20번 통로 우측 4단', price: 34900 },
  { id: 'p16', name: '건전지 AA 10입', aliases: ['건전지', '배터리'], barcode: '8801234500172', dept: '생활문화', floor: '1F', corner: '계산대 앞', shelf: '계산대 3번 앞 걸이', price: 6900 },
];
