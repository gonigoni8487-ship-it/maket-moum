// 마트ON v2 API: 직원 로그인, 업무요청, 실시간 알림(SSE), 공지, 상품찾기, 사진 AI
import type { Request, Response, NextFunction } from 'express';
import type { GoogleGenAI } from '@google/genai';
import {
  DEPARTMENTS, TASK_CATEGORIES, TASK_STATUSES, SEED_PRODUCTS, MAX_TASK_PHOTOS, type TaskCategory,
  type Actor, type Department, type Notice, type FlyerItem, type Product, type Promotion, matchProduct, promotionFor as sharedPromotionFor, type Staff,
  type StreamEvent, type Task, type TaskStatus, type VisionResult, type AskResult, type Incident, type PatrolLog, type WeeklyReport, type Handover, canSeeIncident, canHandleIncident,
} from '../src/marton/shared';
import { platform } from './platform';
import { registerSecurity } from './marton-security';
import { registerPush, pushFor, type PushSub } from './marton-push';

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

/** data URL 사진을 저장하고 id 목록을 돌려준다 (최대 3장, 장당 1.8MB) */
async function savePhotos(input: unknown): Promise<string[]> {
  if (!Array.isArray(input)) return [];
  const ids: string[] = [];
  for (const item of input.slice(0, MAX_TASK_PHOTOS)) {
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

function deletePhotos(ids: string[] = []) {
  for (const id of ids) {
    if (PHOTO_ID.test(id)) void platform().photos.remove(id).catch(() => {});
  }
}

/** 운영 모드에서는 PIN이 없으면 관리자 로그인을 막는다 */
const managerPin = () => platform().env('MARTON_MANAGER_PIN') || (platform().production ? '' : '0000');
const storeCode = () => platform().env('MARTON_STORE_CODE') || ''; // 매장 공용 접속 코드 (설정 시 로그인에 필요)
const TASK_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const INCIDENT_RETENTION_MS = 180 * 24 * 60 * 60 * 1000; // 손실 분석용 6개월 보관 후 삭제

export interface Db {
  staff: Record<string, Staff>;
  sessions: Record<string, string>; // token -> staffId
  tasks: Task[];
  notices: Notice[];
  products: Product[];
  promotions: Promotion[];
  incidents: Incident[];
  patrols: PatrolLog[];
  reports: WeeklyReport[];
  pushSubs: PushSub[];
  handovers: Handover[];
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
    return db;
  } catch {
    return { staff: {}, sessions: {}, tasks: [], notices: [], products: SEED_PRODUCTS, promotions: [], incidents: [], patrols: [], reports: [], pushSubs: [], handovers: [] };
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
    db.handovers = db.handovers.filter(h => h.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000);
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

function staffFromToken(token: string | undefined) {
  const id = token ? db.sessions[token] : undefined;
  return id ? db.staff[id] : undefined;
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

const describe = (p: Product) => `${p.name}: ${p.floor} ${p.corner}, ${p.shelf} (${p.dept}, ${p.price.toLocaleString()}원)`;

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

  app.get(`${api}/config`, (_req, res) => res.json({ storeCodeRequired: Boolean(storeCode()) }));

  app.post(`${api}/login`, (req, res) => {
    const ip = req.ip || 'unknown';
    if (tooMany(ip)) return res.status(429).json({ error: '로그인 실패가 많아 10분간 제한됩니다. 잠시 후 다시 시도해 주세요.' });
    if (storeCode() && req.body.storeCode !== storeCode()) {
      fail(ip);
      return res.status(403).json({ error: '매장 접속 코드가 올바르지 않습니다.' });
    }
    const id = text(req.body.staffId, 20);
    const name = text(req.body.name, 20);
    const { dept, wantManager } = req.body;
    const duty = text(req.body.duty, 30);
    if (!id || !name || !isDept(dept) || !duty) return res.status(400).json({ error: '사번, 이름, 부서, 담당업무를 모두 입력해 주세요.' });

    const existing = db.staff[id];
    if (existing && existing.name !== name) return res.status(409).json({ error: '이미 다른 이름으로 등록된 사번입니다. 관리자에게 문의하세요.' });

    let role: Staff['role'] = 'staff';
    if (wantManager) {
      if (!managerPin() || req.body.managerPin !== managerPin()) {
        fail(ip);
        return res.status(403).json({ error: '관리자 PIN이 올바르지 않습니다.' });
      }
      role = 'manager';
    }
    const staff: Staff = { id, name, dept, duty, role, title: role === 'manager' ? text(req.body.title, 10) || '점장' : undefined };
    db.staff[id] = staff;
    const token = newId();
    db.sessions[token] = id;
    save();
    res.json({ token, staff });
  });

  registerSecurity(app, genAI, aiEnabled);
  registerPush(app);

  app.post(`${api}/logout`, auth, (req, res) => {
    const token = req.headers.authorization?.slice(7);
    if (token) delete db.sessions[token];
    save();
    res.json({ ok: true });
  });

  app.get(`${api}/bootstrap`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    res.json({
      me,
      tasks: db.tasks,
      notices: db.notices.filter(n => n.scope === 'all' || n.scope === me.dept || me.role === 'manager').slice(-50),
      products: db.products,
      promotions: db.promotions,
      incidents: db.incidents.filter(i => canSeeIncident(me, i)),
      patrols: canHandleIncident(me) ? db.patrols.filter(p => p.at > Date.now() - 14 * 24 * 60 * 60 * 1000) : [],
      reports: me.role === 'manager' ? db.reports.slice(-12) : [],
      handovers: db.handovers.filter(h => h.createdAt > Date.now() - 3 * 24 * 60 * 60 * 1000 && (me.role === 'manager' || h.dept === me.dept)),
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
    if (!PHOTO_ID.test(id) || !db.tasks.some(t => t.photos?.includes(id))) return res.status(404).end();
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

  app.post(`${api}/notices`, auth, managerOnly, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const scope = req.body.scope === 'all' ? 'all' : req.body.scope;
    const title = text(req.body.title, 80);
    if (!title || (scope !== 'all' && !isDept(scope))) return res.status(400).json({ error: '제목과 공지 대상을 확인해 주세요.' });
    const notice: Notice = {
      id: newId().slice(0, 8), scope, title, body: text(req.body.body, 1000), urgent: Boolean(req.body.urgent),
      by: actorOf(me), createdAt: Date.now(), readBy: [me.id],
    };
    db.notices.push(notice);
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
    const keyword = question.replace(/(어디|있어요|있나요|있어|위치|알려줘|찾아줘|은|는|이|가|\?|요)/g, ' ').trim();
    let products = searchProducts(keyword || question);
    if (!products.length) products = keyword.split(/\s+/).flatMap(w => searchProducts(w, 3)).slice(0, 5);

    // 매장 상품 목록에 없어도 이번 전단 행사상품이면 행사 내용은 알려 준다
    const words = keyword.split(/\s+/).filter(w => w.length >= 2);
    const promo = [...db.promotions].reverse().find(p => words.some(w => p.name.replace(/\s+/g, '').includes(w)));
    const promoText = (p: Promotion) => `${p.name}${p.spec ? `(${p.spec.split('/')[0]})` : ''} 행사 중${p.price ? ` ${p.price.toLocaleString()}원` : ''}${p.condition ? `, ${p.condition}` : ''}`;
    const fallback = (): AskResult => ({
      answer: products.length
        ? `${products[0].name}: ${products[0].floor} ${products[0].corner}, ${products[0].shelf}에 있습니다.${promo && promotionFor(products[0]) === promo ? ` ${promoText(promo)}입니다.` : ''}`
        : promo
          ? `${promoText(promo)}입니다. 진열 위치는 상품 목록에 없어 담당 부서에 확인해 주세요.`
          : '상품 DB에서 찾지 못했습니다. 해당 부서에 위치 확인 요청을 보내보세요.',
      products,
    });
    if (!aiEnabled) return res.json(fallback());

    try {
      const catalog = (products.length ? products : db.products).map(describe).join('\n');
      const promos = db.promotions.slice(-30).map(p => `${p.name} ${p.spec ?? ''} ${p.price ?? ''}원 ${p.condition ?? ''} ${p.period ?? ''}`).join('\n');
      const response = await genAI.models.generateContent({
        model: AI_MODEL,
        contents: [{ parts: [{ text: `당신은 대형마트 직원용 안내 AI입니다. 아래 상품 위치 데이터만 근거로, 직원이 고객에게 바로 말해줄 수 있게 한국어 존댓말 1~2문장으로 답하세요. 데이터에 없으면 모른다고 하고 어느 부서에 물어볼지 제안하세요. 행사 정보가 있으면 덧붙이세요.\n\n[상품 위치]\n${catalog}\n\n[진행 중 행사]\n${promos || '없음'}\n\n[질문]\n${question}` }] }],
      });
      res.json({ answer: response.text?.trim() || fallback().answer, products });
    } catch (error) {
      console.error('MartON ask error:', error);
      res.json(fallback());
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
