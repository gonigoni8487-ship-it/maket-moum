// 마트ON 웹 푸시: 앱이 닫혀 있거나 화면이 꺼져 있어도 업무요청·공지·보안 경보를 받는다.
import { canHandleIncident, type Staff, type StreamEvent } from '../src/marton/shared';
import { db, save, auth, text, type AuthedRequest, type RouteApp } from './marton';
import { platform, onJob } from './platform';
import { generateVapidKeys, sendWebPush, type VapidKeys } from './webpush';

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

let vapidPromise: Promise<VapidKeys> | null = null;

/** VAPID 키: 환경변수 우선, 없으면 처음 쓸 때 생성해 데이터에 보관 */
function vapidKeys(): Promise<VapidKeys> {
  vapidPromise ??= (async () => {
    const publicKey = platform().env('MARTON_VAPID_PUBLIC_KEY');
    const privateKey = platform().env('MARTON_VAPID_PRIVATE_KEY');
    if (publicKey && privateKey) return { publicKey, privateKey };
    if (!db.vapid) {
      db.vapid = await generateVapidKeys();
      save();
    }
    return db.vapid;
  })();
  return vapidPromise;
}

async function sendTo(who: (s: Staff) => boolean, msg: PushMessage) {
  const targets = db.pushSubs.filter(sub => {
    const staff = db.staff[sub.staffId];
    return staff && who(staff);
  });
  if (!targets.length) return;
  const vapid = { ...(await vapidKeys()), subject: platform().env('MARTON_VAPID_SUBJECT') || 'mailto:marton@example.com' };
  const payload = JSON.stringify({ ...msg, url: '/marton/' });
  const opts = { ttl: msg.urgent ? 600 : 3600, urgency: msg.urgent ? 'high' : 'normal', topic: msg.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) } as const;
  await Promise.all(targets.map(async sub => {
    try {
      const status = await sendWebPush(sub, payload, opts, vapid);
      if (status === 404 || status === 410) {
        db.pushSubs = db.pushSubs.filter(s => s.endpoint !== sub.endpoint); // 만료된 구독 정리
        save();
      } else if (status >= 400) {
        console.error('MartON push rejected:', status, new URL(sub.endpoint).host);
      }
    } catch (e) {
      console.error('MartON push error:', e);
    }
  }));
}

// ---- 긴급 재알림: 아무도 확인하지 않으면 1분 간격으로 다시 보낸다 ----
// 서버가 잠들거나 재시작해도 실행되도록 예약 작업으로 처리하고, 실행 시점의 상태로 대상과 문구를 다시 만든다.
type RepeatJob = { kind: 'task' | 'incident'; id: string; round: number };

function urgentTaskPush(id: string) {
  const t = db.tasks.find(x => x.id === id);
  if (!t || t.status !== '접수') return null;
  return {
    who: (s: Staff) => s.id !== t.createdBy.id && s.dept === t.toDept,
    msg: { title: `🚨 긴급 · ${t.toDept} 담당님 호출입니다`, body: `${t.fromDept} ${t.category}: ${t.title}${t.location ? ` (${t.location})` : ''}`, urgent: true, tag: `task-${t.id}` },
  };
}

function urgentIncidentPush(id: string) {
  const i = db.incidents.find(x => x.id === id);
  if (!i || i.status !== '접수') return null;
  return {
    who: (s: Staff) => canHandleIncident(s) && s.id !== i.reportedBy.id,
    msg: { title: `🚨 보안 ${i.type}`, body: `${i.zone}${i.productName ? ` · ${i.productName}` : ''}`, urgent: true, tag: `incident-${i.id}` },
  };
}

function scheduleRepeat(job: RepeatJob) {
  if (job.round > REPEAT_TIMES) return;
  void platform().schedule({ at: Date.now() + REPEAT_MS, type: 'push-repeat', data: job });
}

onJob('push-repeat', async (job: RepeatJob) => {
  const target = job.kind === 'task' ? urgentTaskPush(job.id) : urgentIncidentPush(job.id);
  if (!target) return; // 이미 확인됨
  await sendTo(target.who, { ...target.msg, title: `[재알림 ${job.round}] ${target.msg.title}` });
  scheduleRepeat({ ...job, round: job.round + 1 });
});

/** 실시간 이벤트 → 푸시 대상과 문구 (화면 알림 규칙과 동일) */
export function pushFor(event: StreamEvent) {
  if (event.type === 'task') {
    const t = event.task;
    if (event.action === 'created') {
      const who = (s: Staff) => s.id !== t.createdBy.id && (s.dept === t.toDept || (t.urgent && s.role === 'manager'));
      const msg = { title: `${t.urgent ? '🚨 긴급 · ' : '📣 '}${t.toDept} 담당님 호출입니다`, body: `${t.fromDept} ${t.category}: ${t.title}${t.location ? ` (${t.location})` : ''}`, urgent: t.urgent, tag: `task-${t.id}` };
      void sendTo(who, msg);
      if (t.urgent) scheduleRepeat({ kind: 'task', id: t.id, round: 1 });
    } else {
      const last = t.history[t.history.length - 1];
      if (last.by.id !== t.createdBy.id) {
        void sendTo(s => s.id === t.createdBy.id, { title: `요청 ${last.status}`, body: `${t.title} — ${last.by.dept} ${last.by.name}`, urgent: false, tag: `task-${t.id}` });
      }
    }
  } else if (event.type === 'notice') {
    const n = event.notice;
    if (n.readBy.length > 1) return; // 읽음 표시 갱신은 알리지 않음
    const title = n.kind === 'broadcast' ? `📢 ${n.title}` : n.kind === 'meeting' ? `🕑 ${n.title}` : `${n.urgent ? '🚨 긴급 ' : ''}${n.scope === 'all' ? '전체' : n.scope} 공지`;
    const body = n.kind ? n.body || n.title : n.title;
    void sendTo(s => s.id !== n.by.id && (n.scope === 'all' || n.scope === s.dept), { title, body, urgent: n.urgent, tag: `notice-${n.id}` });
  } else if (event.type === 'incident') {
    const i = event.incident;
    if (event.action === 'created') {
      const where = `${i.zone}${i.productName ? ` · ${i.productName}` : ''}`;
      const handlers = (s: Staff) => canHandleIncident(s) && s.id !== i.reportedBy.id;
      const msg = { title: `${i.urgent ? '🚨 ' : ''}보안 ${i.type}`, body: where, urgent: i.urgent, tag: `incident-${i.id}` };
      void sendTo(handlers, msg);
      void sendTo(s => !canHandleIncident(s) && s.dept === i.dept && s.id !== i.reportedBy.id, { title: `보안 ${i.type}`, body: `${where} — 주변 고객 응대로 확인 부탁드립니다`, urgent: false, tag: `incident-${i.id}` });
      if (i.urgent) scheduleRepeat({ kind: 'incident', id: i.id, round: 1 });
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

export function registerPush(app: RouteApp) {
  const api = '/api/marton/push';

  app.get(`${api}/key`, async (_req, res) => res.json({ publicKey: (await vapidKeys()).publicKey }));

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
