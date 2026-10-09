// 마트ON 안전·고객: 비상 알림(화재·사고·재난 사이렌), 도와드리겠습니다 컴플레인 공유
import {
  COMPLAINT_STATUSES, DEPARTMENTS, EMERGENCY_TYPES, MAX_COMPLAINT_PHOTOS, canClearEmergency, canEditComplaint,
  type Complaint, type ComplaintStatus, type Department, type Emergency, type EmergencyType,
} from '../src/marton/shared';
import { db, save, broadcast, auth, actorOf, text, newId, savePhotos, deletePhotos, type AuthedRequest, type RouteApp } from './marton';

const DAY = 24 * 60 * 60 * 1000;
const isDept = (d: unknown): d is Department => DEPARTMENTS.includes(d as Department);
const deptsOf = (input: unknown) => (Array.isArray(input) ? [...new Set(input.filter(isDept))] : []);

/** 오래된 기록 정리: 해제된 비상 알림 90일, 처리완료 컴플레인 90일 (사진도 삭제) */
export function pruneCare() {
  const cutoff = Date.now() - 90 * DAY;
  if (db.emergencies) db.emergencies = db.emergencies.filter(e => !e.clearedAt || e.clearedAt > cutoff).slice(-200);
  if (db.complaints) {
    const old = db.complaints.filter(c => c.status === '처리완료' && c.updatedAt <= cutoff);
    old.forEach(c => deletePhotos(c.photos));
    db.complaints = db.complaints.filter(c => !old.includes(c));
  }
}

export function registerCare(app: RouteApp) {
  const api = '/api/marton';

  // ---- 비상 알림: 누구나 보낼 수 있고, 전 직원에게 사이렌 ----
  app.post(`${api}/emergencies`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const type = req.body.type as EmergencyType;
    if (!EMERGENCY_TYPES.includes(type)) return res.status(400).json({ error: '화재·사고·재난 중 하나를 골라 주세요.' });
    db.emergencies ??= [];
    // 같은 사람이 같은 상황을 1분 안에 다시 누르면 새로 만들지 않는다 (두 번 누름 방지)
    const dup = db.emergencies.find(e => !e.clearedAt && e.type === type && e.by.id === me.id && e.createdAt > Date.now() - 60000);
    if (dup) return res.json(dup);
    const emergency: Emergency = {
      id: newId().slice(0, 8), type, by: actorOf(me), createdAt: Date.now(),
      location: text(req.body.location, 60) || undefined, note: text(req.body.note, 300) || undefined,
    };
    db.emergencies.push(emergency);
    save();
    broadcast({ type: 'emergency', emergency, action: 'created' });
    res.json(emergency);
  });

  app.post(`${api}/emergencies/:id/clear`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const e = db.emergencies?.find(x => x.id === req.params.id);
    if (!e) return res.status(404).json({ error: '비상 알림을 찾을 수 없습니다.' });
    if (e.clearedAt) return res.json(e);
    if (!canClearEmergency(me, e)) return res.status(403).json({ error: '상황 해제는 점장·부점장, 보안(MS) 또는 알린 분만 할 수 있습니다.' });
    e.clearedAt = Date.now();
    e.clearedBy = actorOf(me);
    save();
    broadcast({ type: 'emergency', emergency: e, action: 'cleared' });
    res.json(e);
  });

  // ---- 도와드리겠습니다: 컴플레인 접수건 공유 ----
  app.post(`${api}/complaints`, auth, async (req, res) => {
    const me = (req as AuthedRequest).staff;
    const clientId = text(req.body.clientId, 40) || undefined;
    const dup = clientId && db.complaints?.find(c => c.clientId === clientId && c.by.id === me.id);
    if (dup) return res.json(dup);
    const content = text(req.body.content, 1000);
    if (!content) return res.status(400).json({ error: '해당 내용을 입력해 주세요.' });
    const depts = deptsOf(req.body.depts);
    if (!depts.length) return res.status(400).json({ error: '전달할 부서를 골라 주세요.' });
    const now = Date.now();
    const status: ComplaintStatus = COMPLAINT_STATUSES.includes(req.body.status) ? req.body.status : '접수';
    const complaint: Complaint = {
      id: newId().slice(0, 8), content, depts, status, by: actorOf(me), createdAt: now, updatedAt: now, readBy: [me.id], clientId,
      action: text(req.body.action, 1000) || undefined,
      compensation: text(req.body.compensation, 300) || undefined,
      assignee: text(req.body.assignee, 20) || undefined,
    };
    const photos = await savePhotos(req.body.photos, MAX_COMPLAINT_PHOTOS);
    if (photos.length) complaint.photos = photos;
    (db.complaints ??= []).push(complaint);
    save();
    broadcast({ type: 'complaint', complaint, action: 'created' });
    res.json(complaint);
  });

  // 처리 내용·보상·담당자·상태 고치기, 사진 더하기 (올린 분, 전달 부서, 점장·부점장)
  app.post(`${api}/complaints/:id`, auth, async (req, res) => {
    const me = (req as AuthedRequest).staff;
    const c = db.complaints?.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: '접수건을 찾을 수 없습니다.' });
    if (!canEditComplaint(me, c)) return res.status(403).json({ error: '올린 분, 전달받은 부서, 점장·부점장만 고칠 수 있습니다.' });
    const b = req.body;
    if (typeof b.content === 'string' && text(b.content, 1000)) c.content = text(b.content, 1000);
    if (typeof b.action === 'string') c.action = text(b.action, 1000) || undefined;
    if (typeof b.compensation === 'string') c.compensation = text(b.compensation, 300) || undefined;
    if (typeof b.assignee === 'string') c.assignee = text(b.assignee, 20) || undefined;
    if (COMPLAINT_STATUSES.includes(b.status)) c.status = b.status;
    const added = deptsOf(b.depts);
    const newDepts = added.filter(d => !c.depts.includes(d));
    if (added.length) c.depts = added;
    const room = MAX_COMPLAINT_PHOTOS - (c.photos?.length ?? 0);
    if (room > 0) {
      const photos = await savePhotos(b.photos, room);
      if (photos.length) c.photos = [...(c.photos ?? []), ...photos];
    }
    c.updatedAt = Date.now();
    c.updatedBy = actorOf(me);
    if (!c.readBy.includes(me.id)) c.readBy.push(me.id);
    save();
    // 새로 추가한 부서에는 접수건처럼 다시 호출한다
    broadcast({ type: 'complaint', complaint: c, action: newDepts.length ? 'created' : 'updated' });
    res.json(c);
  });

  app.post(`${api}/complaints/:id/read`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const c = db.complaints?.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: '접수건을 찾을 수 없습니다.' });
    if (!c.readBy.includes(me.id)) { c.readBy.push(me.id); save(); }
    res.json(c);
  });
}
