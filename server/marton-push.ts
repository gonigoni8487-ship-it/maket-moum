// 마트ON 웹 푸시: 앱이 닫혀 있거나 화면이 꺼져 있어도 업무요청·공지·보안 경보를 받는다.
import type { Express } from 'express';
import webpush from 'web-push';
import { canHandleIncident, type Staff, type StreamEvent } from '../src/marton/shared';
import { db, save, auth, text, type AuthedRequest } from './marton';

export interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  staffId: string;
  createdAt: number;
}

interface PushMessage {
  title: string;
  body: string;
  urgent: boolean;
  tag: string;
}

const REPEAT_MS = 60 * 1000; // 긴급 미확인 시 재알림 간격
const REPEAT_TIMES = 3;

let ready = false;

/** VAPID 키: 환경변수 우선, 없으면 최초 실행 시 생성해 데이터 파일에 보관 */
function initVapid() {
  let publicKey = process.env.MARTON_VAPID_PUBLIC_KEY;
  let privateKey = process.env.MARTON_VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    db.vapid ??= webpush.generateVAPIDKeys();
    save();
    ({ publicKey, privateKey } = db.vapid);
  }
  webpush.setVapidDetails(process.env.MARTON_VAPID_SUBJECT || 'mailto:marton@example.com', publicKey, privateKey);
  ready = true;
  return publicKey;
}

async function sendTo(who: (s: Staff) => boolean, msg: PushMessage) {
  if (!ready) return;
  const targets = db.pushSubs.filter(sub => {
    const staff = db.staff[sub.staffId];
    return staff && who(staff);
  });
  const payload = JSON.stringify({ ...msg, url: '/marton/' });
  await Promise.all(targets.map(async sub => {
    try {
      await webpush.sendNotification(sub, payload, { TTL: msg.urgent ? 600 : 3600, urgency: msg.urgent ? 'high' : 'normal', topic: msg.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) });
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        db.pushSubs = db.pushSubs.filter(s => s.endpoint !== sub.endpoint); // 만료된 구독 정리
        save();
      } else {
        console.error('MartON push error:', status ?? e);
      }
    }
  }));
}

/** 아무도 확인하지 않으면 긴급 알림을 1분 간격으로 다시 보낸다 */
function repeatUntilAcknowledged(isPending: () => boolean, who: (s: Staff) => boolean, msg: PushMessage, round = 1) {
  if (round > REPEAT_TIMES) return;
  setTimeout(() => {
    if (!isPending()) return;
    void sendTo(who, { ...msg, title: `[재알림 ${round}] ${msg.title}` });
    repeatUntilAcknowledged(isPending, who, msg, round + 1);
  }, REPEAT_MS).unref();
}

/** 실시간 이벤트 → 푸시 대상과 문구 (화면 알림 규칙과 동일) */
export function pushFor(event: StreamEvent) {
  if (event.type === 'task') {
    const t = event.task;
    if (event.action === 'created') {
      const who = (s: Staff) => s.id !== t.createdBy.id && (s.dept === t.toDept || (t.urgent && s.role === 'manager'));
      const msg = { title: `${t.urgent ? '🚨 긴급 ' : ''}${t.fromDept} → ${t.toDept} ${t.category}`, body: `${t.title}${t.location ? ` (${t.location})` : ''}`, urgent: t.urgent, tag: `task-${t.id}` };
      void sendTo(who, msg);
      if (t.urgent) repeatUntilAcknowledged(() => db.tasks.find(x => x.id === t.id)?.status === '접수', s => who(s) && s.dept === t.toDept, msg);
    } else {
      const last = t.history[t.history.length - 1];
      if (last.by.id !== t.createdBy.id) {
        void sendTo(s => s.id === t.createdBy.id, { title: `요청 ${last.status}`, body: `${t.title} — ${last.by.dept} ${last.by.name}`, urgent: false, tag: `task-${t.id}` });
      }
    }
  } else if (event.type === 'notice') {
    const n = event.notice;
    if (n.readBy.length > 1) return; // 읽음 표시 갱신은 알리지 않음
    void sendTo(s => s.id !== n.by.id && (n.scope === 'all' || n.scope === s.dept), { title: `${n.urgent ? '🚨 긴급 ' : ''}${n.scope === 'all' ? '전체' : n.scope} 공지`, body: n.title, urgent: n.urgent, tag: `notice-${n.id}` });
  } else if (event.type === 'incident') {
    const i = event.incident;
    if (event.action === 'created') {
      const where = `${i.zone}${i.productName ? ` · ${i.productName}` : ''}`;
      const handlers = (s: Staff) => canHandleIncident(s) && s.id !== i.reportedBy.id;
      const msg = { title: `${i.urgent ? '🚨 ' : ''}보안 ${i.type}`, body: where, urgent: i.urgent, tag: `incident-${i.id}` };
      void sendTo(handlers, msg);
      void sendTo(s => !canHandleIncident(s) && s.dept === i.dept && s.id !== i.reportedBy.id, { title: `보안 ${i.type}`, body: `${where} — 주변 고객 응대로 확인 부탁드립니다`, urgent: false, tag: `incident-${i.id}` });
      if (i.urgent) repeatUntilAcknowledged(() => db.incidents.find(x => x.id === i.id)?.status === '접수', handlers, msg);
    } else {
      const last = i.history[i.history.length - 1];
      if (last.by.id !== i.reportedBy.id) {
        void sendTo(s => s.id === i.reportedBy.id, { title: `보안 신고 ${last.status}`, body: `${i.zone} — ${last.by.name}`, urgent: false, tag: `incident-${i.id}` });
      }
    }
  } else if (event.type === 'handover') {
    const h = event.handover;
    if (h.ackBy.length) return; // 확인 표시 갱신은 알리지 않음
    const summary = [h.openTasks.length && `미처리 ${h.openTasks.length}건`, h.openIncidents.length && `보안 ${h.openIncidents.length}건`, h.note].filter(Boolean).join(' · ');
    void sendTo(s => s.dept === h.dept && s.id !== h.from.id, { title: `${h.dept} 인수인계 — ${h.from.name}`, body: summary || '특이사항 없음', urgent: false, tag: `handover-${h.id}` });
  } else if (event.type === 'report' && event.report.auto) {
    void sendTo(s => s.role === 'manager', { title: '주간 손실방지 리포트', body: '지난주 리포트가 도착했습니다.', urgent: false, tag: `report-${event.report.id}` });
  }
}

export function registerPush(app: Express) {
  const api = '/api/marton/push';
  const publicKey = initVapid();

  app.get(`${api}/key`, (_req, res) => res.json({ publicKey }));

  app.post(`${api}/subscribe`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const sub = req.body.subscription;
    const endpoint = text(sub?.endpoint, 1000);
    if (!/^https:\/\//.test(endpoint) || !sub?.keys?.p256dh || !sub?.keys?.auth) return res.status(400).json({ error: '푸시 구독 정보가 올바르지 않습니다.' });
    // 한 기기(endpoint)는 마지막으로 로그인한 직원에게만 알린다
    db.pushSubs = db.pushSubs.filter(s => s.endpoint !== endpoint);
    db.pushSubs.push({ endpoint, keys: { p256dh: text(sub.keys.p256dh, 200), auth: text(sub.keys.auth, 100) }, staffId: me.id, createdAt: Date.now() });
    save();
    res.json({ ok: true });
  });

  app.post(`${api}/unsubscribe`, auth, (req, res) => {
    const endpoint = text(req.body.endpoint, 1000);
    db.pushSubs = db.pushSubs.filter(s => s.endpoint !== endpoint);
    save();
    res.json({ ok: true });
  });

  app.post(`${api}/test`, auth, async (req, res) => {
    const me = (req as AuthedRequest).staff;
    const count = db.pushSubs.filter(s => s.staffId === me.id).length;
    if (!count) return res.status(400).json({ error: '이 계정에 등록된 푸시 기기가 없습니다. 먼저 푸시 알림을 켜 주세요.' });
    await sendTo(s => s.id === me.id, { title: '마트ON 푸시 테스트', body: '화면이 꺼져 있어도 이렇게 알림이 옵니다.', urgent: false, tag: 'push-test' });
    res.json({ ok: true, devices: count });
  });
}
