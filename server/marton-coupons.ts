// 마트ON 소통 커피쿠폰: 점장·부점장이 직원(시니어·주니어 담당)에게 커피쿠폰을 보내고, 직원은 보관함에서 꺼내 쓴다
import {
  COUPON_ARRIVED, COUPON_COUNTS, COUPON_VALID_DAYS, storeTime,
  type Coupon, type Staff,
} from '../src/marton/shared';
import { db, save, broadcast, auth, managerOnly, actorOf, text, newId, type AuthedRequest, type RouteApp } from './marton';

const DAY = 24 * 60 * 60 * 1000;
const MAX_RECIPIENTS = 60;

/** 쿠폰 번호: 월일-묶음번호-순서 (예: 1009-0007-03) */
function serialOf(batchNo: number, no: number, now: number) {
  const t = storeTime(now);
  return `${String(t.month).padStart(2, '0')}${String(t.date).padStart(2, '0')}-${String(batchNo).padStart(4, '0')}-${String(no).padStart(2, '0')}`;
}

export function registerCoupons(app: RouteApp) {
  const api = '/api/marton';

  // 쿠폰 받을 직원 목록 (관리자만)
  app.get(`${api}/staff`, auth, managerOnly, (_req, res) => {
    const list = Object.values(db.staff)
      .filter(s => s.role !== 'manager')
      .map(s => ({ id: s.id, name: s.name, dept: s.dept, duty: s.duty, level: s.level }))
      .sort((a, b) => a.dept.localeCompare(b.dept) || a.name.localeCompare(b.name));
    res.json(list);
  });

  // 쿠폰 보내기: 받는 사람마다 count장씩, 1번부터 순서대로
  app.post(`${api}/coupons`, auth, managerOnly, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const ids: string[] = Array.isArray(req.body.to) ? [...new Set((req.body.to as unknown[]).map(x => String(x)))] : [];
    const count = Number(req.body.count);
    if (!COUPON_COUNTS.includes(count as never)) return res.status(400).json({ error: '쿠폰 수는 1장, 5장, 10장 중에서 골라 주세요.' });
    const recipients = ids.map(id => db.staff[id]).filter((s): s is Staff => Boolean(s));
    if (!recipients.length) return res.status(400).json({ error: '받을 직원을 한 명 이상 골라 주세요.' });
    if (recipients.length > MAX_RECIPIENTS) return res.status(400).json({ error: `한 번에 ${MAX_RECIPIENTS}명까지 보낼 수 있습니다.` });
    const place = text(req.body.place, 40) || '매장 내 커피 매장';
    const message = text(req.body.message, 100) || undefined;
    const now = Date.now();
    db.couponBatch = (db.couponBatch ?? 0) + 1;
    const batchNo = db.couponBatch;
    const sent: Coupon[] = [];
    for (const s of recipients) {
      const mine: Coupon[] = [];
      for (let no = 1; no <= count; no++) {
        mine.push({
          id: newId(), serial: serialOf(batchNo, no, now), no, total: count, batchId: `${batchNo}-${s.id}`,
          to: { ...actorOf(s), level: s.level }, from: { ...actorOf(me), title: me.title },
          place, item: '커피 1잔', message, createdAt: now, expiresAt: now + COUPON_VALID_DAYS * DAY,
        });
      }
      db.coupons.push(...mine);
      sent.push(...mine);
      broadcast({ type: 'coupon', coupons: mine, action: 'received' }, x => x.id === s.id);
    }
    save();
    res.json({ people: recipients.length, coupons: sent.length, message: COUPON_ARRIVED });
  });

  // 쿠폰 사용: 본인만, 같은 묶음은 1번부터 순서대로
  app.post(`${api}/coupons/:id/use`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const c = db.coupons.find(x => x.id === req.params.id);
    if (!c || c.to.id !== me.id) return res.status(404).json({ error: '쿠폰을 찾을 수 없습니다.' });
    if (c.usedAt) return res.status(409).json({ error: '이미 사용한 쿠폰입니다.' });
    if (c.expiresAt < Date.now()) return res.status(410).json({ error: '기간이 지난 쿠폰입니다.' });
    const earlier = db.coupons.find(x => x.batchId === c.batchId && x.no < c.no && !x.usedAt && x.expiresAt >= Date.now());
    if (earlier) return res.status(409).json({ error: `${earlier.no}번 쿠폰부터 순서대로 사용해 주세요.` });
    c.usedAt = Date.now();
    save();
    broadcast({ type: 'coupon', coupons: [c], action: 'used' }, x => x.id === me.id);
    res.json(c);
  });

  // 보낸 쿠폰 현황 (관리자): 묶음별 사용 수
  app.get(`${api}/coupons/sent`, auth, managerOnly, (_req, res) => {
    const byPerson = new Map<string, { to: Coupon['to']; total: number; used: number; last: number }>();
    for (const c of db.coupons) {
      const row = byPerson.get(c.to.id) ?? { to: c.to, total: 0, used: 0, last: 0 };
      row.total++;
      if (c.usedAt) row.used++;
      row.last = Math.max(row.last, c.createdAt);
      byPerson.set(c.to.id, row);
    }
    res.json([...byPerson.values()].sort((a, b) => b.last - a.last));
  });
}

/** 기간 지나고 30일 넘은 쿠폰은 지운다 */
export function pruneCoupons() {
  const cutoff = Date.now() - 30 * DAY;
  db.coupons = db.coupons.filter(c => c.expiresAt > cutoff);
}
