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
  incidents: Incident[];
  patrols: PatrolLog[];
  reports: WeeklyReport[];
  handovers: Handover[];
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
  list.forEach(i => { const d = new Date(i.occurredAt); byHour[d.getHours()]++; byWeekday[d.getDay()]++; });
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
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 최근 4주 신고로 오늘 순찰 시간대와 구역을 추천한다.
 * 같은 요일·실제 손실 건에 가중치를 주고, 피크 30분 전부터 순찰하도록 잡는다.
 */
export function patrolPlan(incidents: Incident[], now = Date.now(), maxSlots = 4): PatrolSlot[] {
  const today = new Date(now).getDay();
  const score = new Map<string, { hour: number; zone: string; score: number; count: number }>();
  for (const i of incidents) {
    if (i.test || i.occurredAt < now - 28 * DAY_MS || i.occurredAt > now) continue;
    const d = new Date(i.occurredAt);
    const key = `${d.getHours()}|${i.zone}`;
    const w = 1 + (d.getDay() === today ? 1 : 0) + (i.outcome && LOSS_OUTCOMES.includes(i.outcome) ? 1 : 0) - (i.outcome === '오인/정상 구매' ? 0.5 : 0);
    const cur = score.get(key) ?? { hour: d.getHours(), zone: i.zone, score: 0, count: 0 };
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
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const diff = (cur: number, prev: number, unit = '') => {
  if (!prev) return cur ? '(지난주 0)' : '';
  const d = cur - prev;
  return d === 0 ? '(지난주와 동일)' : `(지난주 대비 ${d > 0 ? '+' : ''}${d.toLocaleString()}${unit}, ${d > 0 ? '+' : ''}${pct(d, prev)}%)`;
};
const mins = (ms: number | null) => (ms === null ? '-' : ms < 60000 ? `${Math.round(ms / 1000)}초` : `${Math.round(ms / 60000)}분`);
const fmtDate = (t: number) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`; };

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
