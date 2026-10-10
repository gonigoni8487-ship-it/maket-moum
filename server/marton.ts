// 마트ON v2 API: 직원 로그인, 업무요청, 실시간 알림(SSE), 공지, 상품찾기, 사진 AI
import type { Request, Response, NextFunction } from 'express';
import type { GoogleGenAI } from '@google/genai';
import {
  DEPARTMENTS, TASK_CATEGORIES, TASK_STATUSES, SEED_PRODUCTS, MAX_TASK_PHOTOS, type TaskCategory,
  type Actor, type Department, type Notice, type FlyerItem, type Coupon, type WorkSchedule, type ExpiryCheck, type StoreSound, type Emergency, type Complaint, type CustomerBell, type StaffLevel, STAFF_LEVELS, normalizePhone, type Product, type Promotion, matchProduct, noticeFor, MAX_NOTICE_PHOTOS, promotionFor as sharedPromotionFor, answerQuestion, bayText, BROADCAST_TITLE, meetingTitle, storeDayStart, storeTime, type Staff,
  type StreamEvent, type Task, type TaskStatus, type VisionResult, type AskResult, type Incident, type PatrolLog, type WeeklyReport, type Handover, canSeeIncident, canHandleIncident,
} from '../src/marton/shared';
import { platform, onJob } from './platform';
import { registerSecurity } from './marton-security';
import { registerPush, pushFor, type PushSub } from './marton-push';
import { registerCoupons, pruneCoupons } from './marton-coupons';
import { registerBoard, pruneBoard, saveFiles, FILE_ID } from './marton-board';
import { registerCare, pruneCare } from './marton-care';
import { registerGuard } from './marton-guard';
import { registerKpi, kpiAllowed } from './marton-kpi';
import type { KpiRecord } from '../src/marton/kpi';

/** Express 앱과 Cloudflare용 라우터가 공통으로 가진 부분 */
export interface RouteApp {
  get(path: string, ...handlers: any[]): unknown;
  post(path: string, ...handlers: any[]): unknown;
}

const AI_MODEL = 'gemini-3.5-flash';
const PHOTO_ID = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;
const MAX_PHOTO_BYTES = 1.8 * 1024 * 1024; // Durable Object 저장 한도(행당 2MB) 안쪽

export const newId = () => crypto.randomUUID();

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** data URL 사진을 저장하고 id 목록을 돌려준다 (기본 최대 3장, 장당 1.8MB) */
export async function savePhotos(input: unknown, max = MAX_TASK_PHOTOS): Promise<string[]> {
  if (!Array.isArray(input)) return [];
  const ids: string[] = [];
  for (const item of input.slice(0, max)) {
    const m = typeof item === 'string' ? /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(item) : null;
    if (!m) continue;
    const bytes = base64ToBytes(m[2]);
    if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) continue;
    const id = `${newId()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
    await platform().photos.put(id, bytes);
    ids.push(id);
  }
  return ids;
}

export function deletePhotos(ids: string[] = []) {
  for (const id of ids) {
    if (PHOTO_ID.test(id)) void platform().photos.remove(id).catch(() => {});
  }
}

/** 운영 모드에서는 PIN이 없으면 관리자 로그인을 막는다 */
const managerPin = () => platform().env('MARTON_MANAGER_PIN') || (platform().production ? '' : '0000');

// ---- 관리자 비밀번호: Cloudflare 비밀(MARTON_MANAGER_PIN)이 있으면 그것, 없으면 앱에서 처음 만든 비밀번호(해시 저장) ----
const PIN_ITER = 100_000;
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function pinHash(pin: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PIN_ITER }, key, 256));
}
/** 관리자 비밀번호가 정해져 있는지 */
export const managerPinSet = () => Boolean(managerPin() || db.managerPin);
/** 어디에 정해져 있나: Cloudflare 비밀 / 앱에서 만든 비밀번호 */
export const managerPinSource = (): 'env' | 'app' | 'none' => (managerPin() ? 'env' : db.managerPin ? 'app' : 'none');
/** 관리자 비밀번호 확인 */
export async function checkManagerPin(given: unknown) {
  if (managerPin()) return safeEqual(given, managerPin());
  if (!db.managerPin || typeof given !== 'string' || !given) return false;
  return safeEqual(await pinHash(given, db.managerPin.salt), db.managerPin.hash);
}
/** 앱에서 관리자 비밀번호 저장 (해시만 저장) */
export async function storeManagerPin(pin: string) {
  const salt = newId();
  db.managerPin = { salt, hash: await pinHash(pin, salt), strength: pinStrength(pin), setAt: Date.now() };
  save();
}
/** 비밀번호 강도: 8자 이상 + 영문·숫자·기호 3가지면 강함 */
export function pinStrength(pin: string): 'none' | 'weak' | 'fair' | 'strong' {
  if (!pin) return 'none';
  const kinds = [/[a-z]/i, /\d/, /[^a-z\d]/i].filter(r => r.test(pin)).length;
  if (pin.length >= 8 && kinds >= 3) return 'strong';
  if (pin.length >= 6 && kinds >= 2) return 'fair';
  return 'weak';
}
export const MIN_PIN_LENGTH = 6;
const storeCode = () => platform().env('MARTON_STORE_CODE') || ''; // 매장 공용 접속 코드 (설정 시 로그인에 필요)
const TASK_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const INCIDENT_RETENTION_MS = 180 * 24 * 60 * 60 * 1000; // 손실 분석용 6개월 보관 후 삭제

export interface SecurityLogEntry { at: number; type: 'pin-fail' | 'store-fail' | 'locked' | 'manager-login' | 'manager-blocked' | 'logout-all' | 'pin-setup' | 'pin-change' | 'kpi-access'; detail: string }
export const SESSION_MAX_MS = 30 * 24 * 60 * 60 * 1000;

/** 보안 기록 남기기 */
export function securityLog(type: SecurityLogEntry['type'], detail: string) {
  (db.securityLog ??= []).push({ at: Date.now(), type, detail: detail.slice(0, 120) });
  if (db.securityLog.length > 300) db.securityLog = db.securityLog.slice(-300);
  save();
}

/** 비밀번호 비교: 길이와 관계없이 끝까지 비교해 응답 시간으로 비밀번호를 추측하지 못하게 */
export function safeEqual(given: unknown, expected: string) {
  const a = typeof given === 'string' ? given : '';
  let diff = a.length ^ expected.length;
  for (let i = 0; i < Math.max(a.length, expected.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  return diff === 0 && expected.length > 0;
}

export interface Db {
  staff: Record<string, Staff>;
  sessions: Record<string, string>; // token -> staffId
  /** 로그인 시각 (token -> ms). 30일이 지나면 다시 로그인 */
  sessionAt?: Record<string, number>;
  /** 앱에서 만든 관리자 비밀번호 (PBKDF2 해시만, Cloudflare 비밀이 있으면 그쪽이 우선) */
  managerPin?: { salt: string; hash: string; strength: 'none' | 'weak' | 'fair' | 'strong'; setAt: number };
  /** 보안 기록: 로그인 실패·관리자 로그인·전체 로그아웃 (최근 300건) */
  securityLog?: SecurityLogEntry[];
  tasks: Task[];
  notices: Notice[];
  products: Product[];
  promotions: Promotion[];
  incidents: Incident[];
  patrols: PatrolLog[];
  reports: WeeklyReport[];
  pushSubs: PushSub[];
  handovers: Handover[];
  coupons: Coupon[];
  couponBatch?: number;
  schedules: WorkSchedule[];
  expiryChecks: ExpiryCheck[];
  sounds?: StoreSound[];
  emergencies?: Emergency[];
  complaints?: Complaint[];
  bells?: CustomerBell[];
  /** 실적 지표 (영업기밀) */
  kpi?: KpiRecord[];
  /** 실적 지표를 볼 수 있게 허락받은 시니어 담당 사번 */
  kpiAccess?: string[];
  /** 생일 축하를 보낸 해 (직원별) */
  birthdayDone?: Record<string, number>;
  vapid?: { publicKey: string; privateKey: string };
}

function parseDb(raw: string | null): Db {
  try {
    const db = JSON.parse(raw ?? '') as Db;
    db.promotions ??= [];
    db.incidents ??= [];
    db.patrols ??= [];
    db.reports ??= [];
    db.pushSubs ??= [];
    db.handovers ??= [];
    db.coupons ??= [];
    db.schedules ??= [];
    db.expiryChecks ??= [];
    // 기본 상품: 새로 생긴 항목(오뎅·갈치 등)과 매대 번호를 기존 데이터에도 채운다
    for (const seed of SEED_PRODUCTS) {
      const have = db.products.find(p => p.id === seed.id);
      if (!have) db.products.push(seed);
      else if (have.bay === undefined && seed.bay !== undefined && have.shelf === seed.shelf) Object.assign(have, { bay: seed.bay, slot: seed.slot });
    }
    return db;
  } catch {
    return { staff: {}, sessions: {}, tasks: [], notices: [], products: SEED_PRODUCTS, promotions: [], incidents: [], patrols: [], reports: [], pushSubs: [], handovers: [], coupons: [], schedules: [], expiryChecks: [] };
  }
}

export let db: Db = parseDb(null);

/** 저장된 데이터를 불러온다 (서버 시작 시 한 번) */
export async function initStore() {
  db = parseDb(await platform().loadDb());
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const cutoff = Date.now() - TASK_RETENTION_MS;
    const expired = db.tasks.filter(t => t.status === '완료' && t.updatedAt <= cutoff);
    expired.forEach(t => deletePhotos(t.photos));
    db.tasks = db.tasks.filter(t => t.status !== '완료' || t.updatedAt > cutoff);
    const incidentCutoff = Date.now() - INCIDENT_RETENTION_MS;
    db.incidents = db.incidents.filter(i => i.status !== '종결' || i.updatedAt > incidentCutoff);
    db.patrols = db.patrols.filter(p => p.at > Date.now() - 90 * 24 * 60 * 60 * 1000);
    db.reports = db.reports.slice(-52);
    pruneCoupons();
    pruneBoard();
    pruneCare();
    db.handovers = db.handovers.filter(h => h.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000);
    // 30일 지난 로그인 정리
    for (const [t, at] of Object.entries(db.sessionAt ?? {})) {
      if (Date.now() - at > SESSION_MAX_MS) { delete db.sessions[t]; delete db.sessionAt![t]; }
    }
    void platform().saveDb(JSON.stringify(db)).catch(e => console.error('MartON save failed:', e));
  }, platform().saveDelayMs);
}

// ---- 실시간 스트림 (Server-Sent Events) ----
interface Client { write(chunk: string): unknown }
const clients = new Map<Client, Staff>();

function onlineCounts() {
  const counts: Record<string, number> = {};
  const seen = new Set<string>();
  for (const s of clients.values()) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    counts[s.dept] = (counts[s.dept] || 0) + 1;
  }
  return counts;
}

/** who를 지정하면 해당 직원에게만 보낸다 (보안 신고 등 열람 제한 데이터). */
export function broadcast(event: StreamEvent, who?: (s: Staff) => boolean) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const [client, staff] of clients) {
    if (!who || who(db.staff[staff.id] ?? staff)) client.write(payload);
  }
  pushFor(event);
}

// ---- 인증 ----
export type AuthedRequest = Request & { staff: Staff };

/** 로그인 토큰은 crypto.randomUUID() 형식만 받는다 (__proto__ 같은 값으로 내부 데이터를 건드리지 못하게) */
const TOKEN_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const validToken = (t: unknown): t is string => typeof t === 'string' && TOKEN_FORMAT.test(t);
/** 사번은 영문·숫자·하이픈만 */
const STAFF_ID_FORMAT = /^[A-Za-z0-9-]{1,20}$/;

function staffFromToken(token: string | undefined) {
  if (!validToken(token) || !Object.hasOwn(db.sessions, token)) return undefined;
  const id = db.sessions[token];
  if (!id || !Object.hasOwn(db.staff, id)) return undefined;
  const at = (db.sessionAt ??= {})[token];
  if (at === undefined) { db.sessionAt[token] = Date.now(); save(); } // 예전 로그인: 지금부터 30일
  else if (Date.now() - at > SESSION_MAX_MS) { delete db.sessions[token]; delete db.sessionAt[token]; save(); return undefined; }
  return db.staff[id];
}

export function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : (req.query.token as string | undefined);
  const staff = staffFromToken(token);
  if (!staff) return res.status(401).json({ error: '로그인이 필요합니다.' });
  (req as AuthedRequest).staff = staff;
  next();
}

export function managerOnly(req: Request, res: Response, next: NextFunction) {
  if ((req as AuthedRequest).staff.role !== 'manager') return res.status(403).json({ error: '점장/부점장 전용 기능입니다.' });
  next();
}

export const actorOf = (s: Staff): Actor => ({ id: s.id, name: s.name, dept: s.dept });
const isDept = (v: unknown): v is Department => DEPARTMENTS.includes(v as Department);
export const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// ---- 상품 검색 ----
function searchProducts(q: string, limit = 8): Product[] {
  const query = q.replace(/\s+/g, '').toLowerCase();
  if (!query) return [];
  const scored = db.products.map(p => {
    const names = [p.name, ...p.aliases].map(n => n.replace(/\s+/g, '').toLowerCase());
    let score = 0;
    if (p.barcode === q.trim()) score = 100;
    for (const n of names) {
      if (n === query) score = Math.max(score, 50);
      else if (n.includes(query)) score = Math.max(score, 30);
      else if (query.includes(n)) score = Math.max(score, 20);
    }
    return { p, score };
  });
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.p);
}

const promotionFor = (p: Product) => sharedPromotionFor(p, db.promotions);

const describe = (p: Product) => `${p.name}: ${p.floor} ${p.corner}, ${bayText(p)} (${p.dept}, ${p.price.toLocaleString()}원)`;

export function parseJson<T>(raw: string | undefined): T {
  let t = raw || '{}';
  if (t.includes('```')) t = t.split('```')[1].replace(/^json/, '');
  return JSON.parse(t.trim()) as T;
}

function parseImage(dataUrl: unknown) {
  if (typeof dataUrl !== 'string') return null;
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(dataUrl);
  return m ? { mimeType: m[1], data: m[2] } : null;
}

/** 금액: 2980, "2,980원" 모두 숫자로. "2,950/4,950원"·"69,000~99,000원"처럼 여러 개면 첫 금액 */
const amount = (v: unknown) => {
  const first = /\d[\d,]*/.exec(String(v ?? ''))?.[0];
  const n = typeof v === 'number' ? v : Number(first?.replace(/,/g, '') ?? NaN);
  return Number.isFinite(n) && n > 0 && n < 100_000_000 ? Math.round(n) : undefined;
};

/** 전단 인식·직원 입력을 같은 모양으로 정리 */
function cleanFlyerItem(it: any, fallbackPeriod?: string): FlyerItem | null {
  const name = text(it?.name, 60);
  if (!name) return null;
  const code = String(it?.code ?? '').replace(/[^0-9A-Za-z-]/g, '').slice(0, 20) || undefined;
  return {
    name, code,
    spec: text(it?.spec, 40) || undefined,
    price: amount(it?.price),
    originalPrice: amount(it?.originalPrice),
    condition: text(it?.condition ?? it?.promo, 100) || undefined,
    period: text(it?.period, 40) || fallbackPeriod || undefined,
  };
}

export function registerMartOn(app: RouteApp, genAI: GoogleGenAI) {
  const aiEnabled = Boolean(platform().env('GEMINI_API_KEY'));
  const api = '/api/marton';

  // 로그인 실패 제한: IP별 10분에 20회 — 관리자 PIN·매장 코드 대입 방지, 매장 Wi-Fi는 IP를 공유하므로 여유 있게
  const failures = new Map<string, number[]>();
  const LOGIN_WINDOW_MS = 10 * 60 * 1000;
  const tooMany = (ip: string) => (failures.get(ip) ?? []).filter(t => t > Date.now() - LOGIN_WINDOW_MS).length >= 20;
  const fail = (ip: string) => failures.set(ip, [...(failures.get(ip) ?? []).filter(t => t > Date.now() - LOGIN_WINDOW_MS), Date.now()]);

  app.get(`${api}/config`, (_req, res) => res.json({ storeCodeRequired: Boolean(storeCode()), managerPinSet: managerPinSet() }));

  // 관리자 비밀번호가 아직 없을 때 한 번만: 처음 로그인하는 점장·부점장이 앱에서 만든다
  app.post(`${api}/manager-pin/setup`, async (req, res) => {
    const ip = req.ip || 'unknown';
    if (managerPinSet()) return res.status(409).json({ error: '관리자 비밀번호가 이미 정해져 있습니다. 그 비밀번호로 로그인해 주세요.' });
    if (storeCode() && !safeEqual(req.body.storeCode, storeCode())) return res.status(403).json({ error: '매장 접속 코드가 올바르지 않습니다.' });
    const pin = typeof req.body.pin === 'string' ? req.body.pin : '';
    if (pin.length < MIN_PIN_LENGTH || pin.length > 64) return res.status(400).json({ error: `관리자 비밀번호는 ${MIN_PIN_LENGTH}자 이상으로 정해 주세요.` });
    await storeManagerPin(pin);
    securityLog('pin-setup', `${text(req.body.name, 20)}(${text(req.body.staffId, 20)}) · IP ${ip} — 관리자 비밀번호를 처음 만듦`);
    res.json({ ok: true });
  });

  app.post(`${api}/login`, async (req, res) => {
    const ip = req.ip || 'unknown';
    if (tooMany(ip)) {
      securityLog('locked', `IP ${ip} — 로그인 실패가 많아 10분 차단`);
      return res.status(429).json({ error: '로그인 실패가 많아 10분간 제한됩니다. 잠시 후 다시 시도해 주세요.' });
    }
    if (storeCode() && !safeEqual(req.body.storeCode, storeCode())) {
      fail(ip);
      securityLog('store-fail', `IP ${ip} — 매장 접속 코드 틀림`);
      return res.status(403).json({ error: '매장 접속 코드가 올바르지 않습니다.' });
    }
    const id = text(req.body.staffId, 20);
    if (id && !STAFF_ID_FORMAT.test(id)) return res.status(400).json({ error: '사번은 숫자(또는 영문·숫자)로 입력해 주세요.' });
    const name = text(req.body.name, 20);
    const { dept, wantManager } = req.body;
    const duty = text(req.body.duty, 30);
    if (!id || !name || !isDept(dept) || !duty) return res.status(400).json({ error: '사번, 이름, 부서, 담당업무를 모두 입력해 주세요.' });
    const store = text(req.body.store, 20);
    const rank = text(req.body.rank, 10);
    // 전화번호: 새로 넣으면 바꾸고, 비워 두면 등록된 번호를 그대로 쓴다
    const given = text(req.body.phone, 20);
    const phone = given ? normalizePhone(given) : db.staff[id]?.phone ?? null;
    if (!store || !rank) return res.status(400).json({ error: '점명과 직급을 입력해 주세요.' });
    if (!phone) return res.status(400).json({ error: '전화번호를 010-0000-0000 형식으로 입력해 주세요.' });

    const existing = db.staff[id];
    if (existing && existing.name !== name) return res.status(409).json({ error: '이미 다른 이름으로 등록된 사번입니다. 관리자에게 문의하세요.' });

    let role: Staff['role'] = 'staff';
    if (wantManager) {
      if (!managerPinSet()) return res.status(409).json({ error: '관리자 비밀번호가 아직 없습니다. 「관리자 비밀번호 처음 만들기」로 먼저 만들어 주세요.', code: 'pin-unset' });
      if (!(await checkManagerPin(req.body.managerPin))) {
        fail(ip);
        securityLog('pin-fail', `${name}(${id}) · IP ${ip} — 관리자 비밀번호 틀림`);
        return res.status(403).json({ error: '관리자 PIN이 올바르지 않습니다.' });
      }
      role = 'manager';
      securityLog('manager-login', `${text(req.body.title, 10) || '점장'} ${name}(${id}) · IP ${ip}`);
    } else if (existing?.role === 'manager') {
      // 관리자 사번으로 비밀번호 없이 들어와 관리자 권한을 빼앗거나 흉내 내지 못하게
      fail(ip);
      securityLog('manager-blocked', `${name}(${id}) · IP ${ip} — 관리자 사번으로 일반 로그인 시도`);
      return res.status(403).json({ error: '관리자로 등록된 사번입니다. 「점장/부점장으로 로그인」을 켜고 관리자 비밀번호를 넣어 주세요.' });
    }
    const level = STAFF_LEVELS.includes(req.body.level) ? req.body.level as StaffLevel : existing?.level;
    const bday = text(req.body.birthday, 10);
    const birthday = /^(\d{4}-)?\d{2}-\d{2}$/.test(bday) ? bday : req.body.birthday === '' ? undefined : existing?.birthday;
    const staff: Staff = { id, name, dept, duty, role, title: role === 'manager' ? text(req.body.title, 10) || '점장' : undefined, store, rank, phone, ...(level ? { level } : {}), ...(birthday ? { birthday } : {}) };
    db.staff[id] = staff;
    const token = newId();
    db.sessions[token] = id;
    (db.sessionAt ??= {})[token] = Date.now();
    save();
    res.json({ token, staff });
  });

  registerSecurity(app, genAI, aiEnabled);
  registerPush(app);
  registerCoupons(app);
  registerBoard(app, genAI, aiEnabled);
  registerCare(app);
  registerGuard(app);
  registerKpi(app, genAI, aiEnabled);

  app.post(`${api}/logout`, auth, (req, res) => {
    const token = req.headers.authorization?.slice(7);
    if (validToken(token)) { delete db.sessions[token]; delete db.sessionAt?.[token]; }
    save();
    res.json({ ok: true });
  });

  app.get(`${api}/bootstrap`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    res.json({
      me,
      tasks: db.tasks,
      notices: db.notices.filter(n => noticeFor(n, me.dept) || me.role === 'manager').slice(-50),
      products: db.products,
      promotions: db.promotions,
      incidents: db.incidents.filter(i => canSeeIncident(me, i)),
      patrols: canHandleIncident(me) ? db.patrols.filter(p => p.at > Date.now() - 14 * 24 * 60 * 60 * 1000) : [],
      reports: me.role === 'manager' ? db.reports.slice(-12) : [],
      handovers: db.handovers.filter(h => h.createdAt > Date.now() - 3 * 24 * 60 * 60 * 1000 && (me.role === 'manager' || h.dept === me.dept)),
      coupons: db.coupons.filter(c => c.to.id === me.id),
      schedules: db.schedules.slice(-3),
      sounds: db.sounds ?? [],
      emergencies: (db.emergencies ?? []).filter(e => !e.clearedAt || e.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000),
      complaints: (db.complaints ?? []).slice(-100),
      kpi: kpiAllowed(me),
      bells: (db.bells ?? []).filter(b => !b.answeredAt || b.answeredAt > Date.now() - 12 * 60 * 60 * 1000),
      expiryChecks: db.expiryChecks.filter(c => (me.role === 'manager' || c.dept === me.dept) && c.at > Date.now() - 7 * 24 * 60 * 60 * 1000),
      online: onlineCounts(),
      aiEnabled,
    });
  });

  app.get(`${api}/stream`, auth, (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    res.write(': connected\n\n');
    clients.set(res, (req as AuthedRequest).staff);
    broadcast({ type: 'presence', online: onlineCounts() });
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(res);
      broadcast({ type: 'presence', online: onlineCounts() });
    });
  });

  app.post(`${api}/tasks`, auth, async (req, res) => {
    const me = (req as AuthedRequest).staff;
    const { category, toDept, urgent } = req.body;
    if (!TASK_CATEGORIES.includes(category) || !isDept(toDept)) return res.status(400).json({ error: '요청 유형과 받는 부서를 선택해 주세요.' });
    // 오프라인 재전송: 같은 clientId면 이미 만든 요청을 돌려준다
    const clientId = text(req.body.clientId, 40) || undefined;
    const dup = clientId && db.tasks.find(t => t.clientId === clientId && t.createdBy.id === me.id);
    if (dup) return res.json(dup);
    const now = Date.now();
    const task: Task = {
      id: newId().slice(0, 8),
      category,
      title: text(req.body.title, 60) || `${toDept} ${category}`,
      detail: text(req.body.detail, 500),
      location: text(req.body.location, 60) || undefined,
      fromDept: me.dept,
      toDept,
      urgent: Boolean(urgent),
      status: '접수',
      createdBy: actorOf(me),
      createdAt: now,
      updatedAt: now,
      history: [{ status: '접수', by: actorOf(me), at: now }],
      clientId,
    };
    const photos = await savePhotos(req.body.photos);
    if (photos.length) task.photos = photos;
    db.tasks.push(task);
    save();
    broadcast({ type: 'task', task, action: 'created' });
    res.json(task);
  });

  // 첨부 사진: 로그인한 직원만 (img 태그는 헤더를 못 보내므로 ?token= 사용)
  app.get(`${api}/photos/:id`, auth, async (req, res) => {
    const id = req.params.id;
    if (!PHOTO_ID.test(id) || !(db.tasks.some(t => t.photos?.includes(id)) || db.notices.some(n => n.photos?.includes(id)) || Boolean(db.complaints?.some(c => c.photos?.includes(id))))) return res.status(404).end();
    const bytes = await platform().photos.get(id);
    if (!bytes) return res.status(404).end();
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.type(id.split('.').pop()!).send(bytes);
  });

  app.post(`${api}/tasks/:id/status`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const task = db.tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: '업무를 찾을 수 없습니다.' });
    const status = req.body.status as TaskStatus;
    if (status === task.status) return res.json(task); // 재전송된 같은 처리 → 성공으로 간주
    if (!TASK_STATUSES.includes(status) || TASK_STATUSES.indexOf(status) <= TASK_STATUSES.indexOf(task.status)) {
      return res.status(400).json({ error: '이미 처리된 단계입니다.' });
    }
    const now = Date.now();
    task.status = status;
    task.updatedAt = now;
    task.history.push({ status, by: actorOf(me), at: now, note: text(req.body.note, 200) || undefined });
    save();
    broadcast({ type: 'task', task, action: 'updated' });
    res.json(task);
  });

  // 근무 교대 인수인계: 우리 부서 미처리 업무·보안 이슈를 자동 요약 + 메모
  app.post(`${api}/handovers`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const clientId = text(req.body.clientId, 40) || undefined;
    const dup = clientId && db.handovers.find(h => h.clientId === clientId);
    if (dup) return res.json(dup);
    const handover: Handover = {
      id: newId().slice(0, 8),
      dept: me.dept,
      from: actorOf(me),
      createdAt: Date.now(),
      note: text(req.body.note, 1000),
      openTasks: db.tasks.filter(t => t.toDept === me.dept && t.status !== '완료')
        .map(t => ({ id: t.id, title: t.title, status: t.status, urgent: t.urgent, fromDept: t.fromDept })),
      openIncidents: db.incidents.filter(i => i.dept === me.dept && i.status !== '종결' && !i.test)
        .map(i => ({ id: i.id, zone: i.zone, type: i.type, status: i.status })),
      ackBy: [],
      clientId,
    };
    db.handovers.push(handover);
    save();
    broadcast({ type: 'handover', handover }, s => s.dept === handover.dept || s.role === 'manager');
    res.json(handover);
  });

  app.post(`${api}/handovers/:id/ack`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const handover = db.handovers.find(h => h.id === req.params.id);
    if (!handover) return res.status(404).json({ error: '인수인계를 찾을 수 없습니다.' });
    if (!handover.ackBy.some(a => a.id === me.id)) {
      handover.ackBy.push({ id: me.id, name: me.name, at: Date.now() });
      save();
      broadcast({ type: 'handover', handover }, s => s.dept === handover.dept || s.role === 'manager');
    }
    res.json(handover);
  });

  // 중회 10분 전: 같은 대상에게 "10분 후 14시 중회 있습니다"를 다시 알린다
  onJob('meeting-remind', ({ id }: { id: string }) => {
    const n = db.notices.find(x => x.id === id);
    if (!n?.meetingAt) return;
    const t = storeTime(n.meetingAt);
    const minute = Math.round((n.meetingAt - storeDayStart(n.meetingAt)) / 60000) % 60;
    const reminder: Notice = {
      id: newId().slice(0, 8), scope: n.scope, depts: n.depts, title: meetingTitle(t.hour, minute, '10분 후'), body: n.body, urgent: false,
      by: n.by, createdAt: Date.now(), readBy: [n.by.id], kind: 'meeting', meetingAt: n.meetingAt,
    };
    db.notices.push(reminder);
    save();
    broadcast({ type: 'notice', notice: reminder });
  });

  app.post(`${api}/notices`, auth, managerOnly, async (req, res) => {
    const me = (req as AuthedRequest).staff;
    const scope = req.body.scope === 'all' ? 'all' : req.body.scope;
    const title = text(req.body.title, 80);
    const kind = ['broadcast', 'meeting', 'order', 'share'].includes(req.body.kind) ? req.body.kind as Notice['kind'] : undefined;
    // 여러 파트: depts 배열 (전체가 아니면 첫 부서를 scope로)
    const depts = Array.isArray(req.body.depts) ? [...new Set((req.body.depts as unknown[]).filter(isDept))] as Department[] : [];
    let target: Notice['scope'] = scope;
    if (scope !== 'all' && depts.length) target = depts[0];
    const bodyText = text(req.body.body, 1000);
    const orderTitle = (kind === 'order' || kind === 'share') && !title ? bodyText.replace(/\s+/g, ' ').slice(0, 30) : title;
    if ((!orderTitle && !kind) || ((kind === 'order' || kind === 'share') && !orderTitle) || (target !== 'all' && !isDept(target))) return res.status(400).json({ error: '제목과 공지 대상을 확인해 주세요.' });
    if (kind === 'broadcast' && !text(req.body.body, 1000)) return res.status(400).json({ error: '방송 내용을 입력해 주세요.' });
    const notice: Notice = {
      id: newId().slice(0, 8), scope: target, title: orderTitle, body: bodyText, urgent: Boolean(req.body.urgent),
      by: actorOf(me), createdAt: Date.now(), readBy: [me.id], kind, byTitle: me.title,
      ...(target !== 'all' && depts.length > 1 ? { depts } : {}),
    };
    if (kind === 'broadcast') notice.title = BROADCAST_TITLE;
    if (kind === 'meeting') {
      const hour = Number(req.body.meetingHour), minute = Number(req.body.meetingMinute) || 0;
      if (!Number.isInteger(hour) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return res.status(400).json({ error: '중회 시각을 확인해 주세요.' });
      notice.title = meetingTitle(hour, minute);
      notice.meetingAt = storeDayStart(Date.now()) + (hour * 60 + minute) * 60000;
      // 10분 전 다시 알림
      const remindAt = notice.meetingAt - 10 * 60000;
      if (remindAt > Date.now()) void platform().schedule({ at: remindAt, type: 'meeting-remind', data: { id: notice.id }, key: `meeting-${notice.id}` });
    }
    const photos = await savePhotos(req.body.photos, MAX_NOTICE_PHOTOS);
    if (photos.length) {
      notice.photos = photos;
      const caps = Array.isArray(req.body.photoCaptions) ? req.body.photoCaptions : [];
      const captions = photos.map((_, i) => text(caps[i], 300));
      if (captions.some(Boolean)) notice.photoCaptions = captions;
    }
    const files = await saveFiles(req.body.files);
    if (files.length) notice.files = files;
    db.notices.push(notice);
    // 공지는 최근 300개만 보관 (지난 공지의 사진도 지운다)
    if (db.notices.length > 300) db.notices.splice(0, db.notices.length - 300).forEach(n => { deletePhotos(n.photos); n.files?.forEach(f => FILE_ID.test(f.id) && void platform().photos.remove(f.id).catch(() => {})); });
    save();
    broadcast({ type: 'notice', notice });
    res.json(notice);
  });

  app.post(`${api}/notices/:id/read`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const notice = db.notices.find(n => n.id === req.params.id);
    if (!notice) return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
    if (!notice.readBy.includes(me.id)) {
      notice.readBy.push(me.id);
      save();
      broadcast({ type: 'notice', notice });
    }
    res.json(notice);
  });

  app.post(`${api}/promotions`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 100) : [];
    const added: Promotion[] = [];
    for (const it of items) {
      const item = cleanFlyerItem(it);
      if (!item) continue;
      // 같은 상품(판매코드 또는 상품명+규격)이 이미 있으면 새 전단 내용으로 바꾼다
      const same = db.promotions.findIndex(pr => (item.code && pr.code === item.code) || (pr.name === item.name && (pr.spec ?? '') === (item.spec ?? '')));
      const promotion: Promotion = {
        ...item, id: same >= 0 ? db.promotions[same].id : newId().slice(0, 8),
        productId: matchProduct(item, db.products)?.id,
        createdAt: Date.now(), by: actorOf(me),
      };
      if (same >= 0) db.promotions[same] = promotion;
      else db.promotions.push(promotion);
      added.push(promotion);
      broadcast({ type: 'promotion', promotion });
    }
    // 오래된 행사는 최근 500개만 보관
    if (db.promotions.length > 500) db.promotions.splice(0, db.promotions.length - 500);
    save();
    res.json(added);
  });

  // "OO 어디 있어요?" — 상품 DB를 근거로 위치 답변
  app.post(`${api}/ai/ask`, auth, async (req, res) => {
    const question = text(req.body.question, 200);
    if (!question) return res.status(400).json({ error: '질문을 입력해 주세요.' });
    // 매장 데이터로 답할 수 있으면 바로 답한다 (항상 같은 말투: "오뎅은 … 12번 매대 3번째 칸에 있어요")
    const direct = answerQuestion(question, db.products, db.promotions);
    if (direct) return res.json(direct);

    const notFound: AskResult = { answer: '상품 목록과 이번 주 행사에서 찾지 못했어요. 담당 부서에 위치 확인 요청을 보내 주세요.', products: [] };
    if (!aiEnabled) return res.json(notFound);
    try {
      const catalog = db.products.map(describe).join('\n');
      const promos = db.promotions.slice(-50).map(p => `${p.name} ${p.spec ?? ''} ${p.price ?? ''}원 ${p.condition ?? ''} ${p.period ?? ''}`).join('\n');
      const response = await genAI.models.generateContent({
        model: AI_MODEL,
        contents: [{ parts: [{ text: `당신은 대형마트 직원용 안내 AI입니다. 아래 상품 위치·행사 데이터만 근거로, 직원이 고객에게 바로 말해 줄 수 있게 한국어 존댓말 1~2문장으로 답하세요. 위치는 "N번 매대 N번째 칸" 형식을 쓰세요. 데이터에 없으면 모른다고 하고 어느 부서에 물어볼지 제안하세요.\n\n[상품 위치]\n${catalog}\n\n[이번 주 행사]\n${promos || '없음'}\n\n[질문]\n${question}` }] }],
      });
      res.json({ answer: response.text?.trim() || notFound.answer, products: [] } satisfies AskResult);
    } catch (error) {
      console.error('MartON ask error:', error);
      res.json(notFound);
    }
  });

  // 음성 요청 해석 보완: 기기 규칙으로 부서/유형을 못 찾은 문장만 AI로 해석
  app.post(`${api}/ai/parse-request`, auth, async (req, res) => {
    const said = text(req.body.text, 300);
    if (!said) return res.status(400).json({ error: '문장이 비어 있습니다.' });
    if (!aiEnabled) return res.json({});
    try {
      const response = await genAI.models.generateContent({
        model: AI_MODEL,
        contents: [{ parts: [{ text: `대형마트 직원이 말로 한 업무요청을 해석하세요. 받는 부서는 ${DEPARTMENTS.join(', ')} 중 하나, 유형은 ${TASK_CATEGORIES.join(', ')} 중 하나입니다. 모르면 null.
JSON으로만: {"toDept":부서|null,"category":유형|null,"location":"매장 내 위치"|null,"urgent":true|false}

문장: ${said}` }] }],
        config: { responseMimeType: 'application/json' },
      });
      const raw = parseJson<{ toDept?: string; category?: string; location?: string; urgent?: boolean }>(response.text);
      res.json({
        toDept: isDept(raw.toDept) ? raw.toDept : undefined,
        category: TASK_CATEGORIES.includes(raw.category as TaskCategory) ? raw.category : undefined,
        location: text(raw.location, 60) || undefined,
        urgent: raw.urgent === true,
      });
    } catch (error) {
      console.error('MartON parse-request error:', error);
      res.json({});
    }
  });

  // 사진 AI: 행사 전단 / 가격표 / 바코드
  app.post(`${api}/ai/vision`, auth, async (req, res) => {
    const mode = req.body.mode as VisionResult['mode'];
    const clientBarcode = text(req.body.barcode, 20);

    // 기기에서 바코드를 읽은 경우 AI 없이 바로 조회
    if (mode === 'barcode' && clientBarcode) {
      const matched = db.products.find(p => p.barcode === clientBarcode);
      return res.json({ mode, barcode: clientBarcode, matched, message: matched ? describe(matched) : '등록되지 않은 바코드입니다.' } satisfies VisionResult);
    }
    const image = parseImage(req.body.image);
    if (!image) return res.status(400).json({ error: '사진을 첨부해 주세요.' });
    if (!aiEnabled) return res.status(503).json({ error: 'AI 키(GEMINI_API_KEY)가 설정되지 않아 사진 분석을 할 수 없습니다.' });

    const prompts = {
      flyer: [
        '이 사진은 한국 대형마트의 행사 전단지 한 면(또는 행사 POP·쇼카드)입니다. 가격이나 행사 표시가 붙은 상품을 위에서 아래, 왼쪽에서 오른쪽 순서로 빠짐없이 한 상품(묶음)당 한 줄로 추출하세요.',
        '- name: 전단에 적힌 상품명 그대로 (브랜드 포함, "2종", "17종" 같은 묶음 표기 포함). 괄호 안 규격·원산지는 빼고',
        '- code: 판매코드·상품코드·바코드 숫자. 전단에 적혀 있을 때만, 없으면 null (지어내지 말 것)',
        '- spec: 상품명 옆 괄호의 규격·단위·포장·원산지 (예: "각 500g/냉장/원산지 별도표기", "3kg/박스/국산", "각 150g×2봉", "상품별 규격 상이"). 없으면 null',
        '- price: 고객이 실제로 내는 행사가(원, 숫자). 여러 개면 첫 금액. "2개 이상 구매시 1개당 각 8,450원"이면 8450. 화살표 "16,900원→14,900원"이면 오른쪽 14900. 가격 없이 할인율만 있으면 null',
        '- originalPrice: 할인 전 가격(숫자). 화살표 왼쪽 가격, 취소선 가격, "비회원가", "1개 구매시" 가격, 행사카드 할인 전 가격. 없으면 null',
        '- condition: 행사 프로모션을 짧게. 종류를 앞에 쓰기: "L.POINT 40% 할인", "L.POINT 5천원 할인", "행사카드 1천원 할인", "1+1", "2+1", "2개 이상 50% 할인", "2팩 구매 시 9,900원", "가격할인 30%", "3만원 이상 구매 시 사은품 증정". 가격이 여러 개("2,950/4,950원", "69,000~99,000원")면 그대로 덧붙이고, "교차구매 가능", "한정수량", "신상품", "단독"이 있으면 쉼표로 덧붙이기. 행사 표시가 없으면 null',
        '- period: 그 상품에만 따로 적힌 기간(예: "※기간: 10/9(금)~10/11(일)")이 있으면 "10/9~10/11"처럼. 없으면 null',
        '전단 위쪽이나 아래쪽의 "전단적용기간"은 period 최상위에 "10/8~10/14"처럼 넣으세요. 하단 작은 글씨 안내문, 카드사 로고, 브랜드 로고만 있는 영역은 상품이 아닙니다.',
        '읽을 수 없거나 확실하지 않은 값은 지어내지 말고 null.',
        'JSON: {"period":"전단 공통 행사기간 또는 null","items":[{"name":"","code":null,"spec":null,"price":0,"originalPrice":null,"condition":null,"period":null}]}',
      ].join('\n'),
      price: '이 가격표(쇼카드/전자가격표) 사진에서 상품명과 표시 가격을 읽으세요. JSON: {"name":"상품명","price":숫자}',
      barcode: '이 사진에서 바코드 아래 숫자(EAN/UPC)와 상품명을 읽으세요. JSON: {"barcode":"숫자만","name":"보이는 상품명 또는 null"}',
    } as const;
    if (!(mode in prompts)) return res.status(400).json({ error: '분석 유형이 올바르지 않습니다.' });

    try {
      const response = await genAI.models.generateContent({
        model: AI_MODEL,
        contents: [{ parts: [{ inlineData: image }, { text: prompts[mode] }] }],
        config: { responseMimeType: 'application/json' },
      });
      const raw = parseJson<Record<string, any>>(response.text);

      if (mode === 'flyer') {
        const period = text(raw.period, 40) || undefined;
        const items = (Array.isArray(raw.items) ? raw.items : []).slice(0, 100)
          .map((it: unknown) => cleanFlyerItem(it, period))
          .filter((it: FlyerItem | null): it is FlyerItem => Boolean(it))
          .map((it: FlyerItem) => ({ ...it, productId: matchProduct(it, db.products)?.id }));
        return res.json({ mode, items } satisfies VisionResult);
      }
      if (mode === 'price') {
        const name = raw.name as string | undefined;
        const price = Number(raw.price) || undefined;
        const matched = name ? searchProducts(name, 1)[0] : undefined;
        const promotion = matched ? promotionFor(matched) : undefined;
        const expected = promotion?.price ?? matched?.price;
        const verdict = !matched || !price || !expected ? 'unknown' : expected === price ? 'ok' : 'mismatch';
        const message = verdict === 'ok' ? `가격표 정상 (${price!.toLocaleString()}원)`
          : verdict === 'mismatch' ? `가격 불일치: 가격표 ${price!.toLocaleString()}원 / 시스템 ${expected!.toLocaleString()}원${promotion ? ' (행사가)' : ''}`
          : '상품을 특정하지 못했습니다. 상품명으로 다시 확인해 주세요.';
        return res.json({ mode, name, price, matched, promotion, verdict, message } satisfies VisionResult);
      }
      const barcode = String(raw.barcode || '').replace(/\D/g, '') || undefined;
      const matched = (barcode && db.products.find(p => p.barcode === barcode)) || (raw.name ? searchProducts(raw.name, 1)[0] : undefined);
      res.json({ mode, barcode, guessName: raw.name || undefined, matched, message: matched ? describe(matched) : '상품을 식별하지 못했습니다.' } satisfies VisionResult);
    } catch (error) {
      console.error('MartON vision error:', error);
      res.status(500).json({ error: '사진 분석에 실패했습니다. 다시 촬영해 주세요.' });
    }
  });
}
