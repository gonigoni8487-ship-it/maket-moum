// 마트ON 게시판: 실적 공유 첨부 파일·사진 요약, 월 근무계획, 소비기한 점검 호출, 생일 축하
import type { GoogleGenAI } from '@google/genai';
import {
  DEPARTMENTS, MAX_FILE_BYTES, SHIFTS, birthdayMessage, isBirthdayToday, normalizeShift, storeDayStart, storeTime,
  type Attachment, type Department, type ExpiryCheck, type ShiftEntry, type Staff, type WorkSchedule,
} from '../src/marton/shared';
import { db, save, broadcast, auth, managerOnly, actorOf, text, newId, parseJson, type AuthedRequest, type RouteApp } from './marton';
import { platform, onJob } from './platform';

const AI_MODEL = 'gemini-3.5-flash';
const DAY = 24 * 60 * 60 * 1000;
export const FILE_ID = /^[a-f0-9-]{36}\.(pdf|xlsx|xls|csv|docx|doc|pptx|ppt|hwp|hwpx|txt|zip)$/;
const FILE_TYPES: Record<string, string> = {
  pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel',
  csv: 'text/csv; charset=utf-8', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ppt: 'application/vnd.ms-powerpoint',
  hwp: 'application/x-hwp', hwpx: 'application/x-hwp', txt: 'text/plain; charset=utf-8', zip: 'application/zip',
};
const isDept = (d: unknown): d is Department => DEPARTMENTS.includes(d as Department);
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function bytesOf(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** 첨부 파일 저장: [{ name, data: data URL }] → Attachment[] (최대 5개, 개당 1.8MB) */
export async function saveFiles(input: unknown): Promise<Attachment[]> {
  if (!Array.isArray(input)) return [];
  const out: Attachment[] = [];
  for (const f of input.slice(0, 5)) {
    const name = text(f?.name, 80);
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const m = typeof f?.data === 'string' ? /^data:[^;,]*(?:;[^,]*)?;base64,([A-Za-z0-9+/=]+)$/.exec(f.data) : null;
    if (!name || !FILE_TYPES[ext] || !m) continue;
    const bytes = bytesOf(m[1]);
    if (!bytes.length || bytes.length > MAX_FILE_BYTES) continue;
    const id = `${newId()}.${ext}`;
    await platform().photos.put(id, bytes);
    out.push({ id, name, size: bytes.length, mime: FILE_TYPES[ext] });
  }
  return out;
}

/** 다음 매장 시각 hh:00 (UTC 밀리초) */
function nextStoreHour(hour: number, now = Date.now()) {
  let at = storeDayStart(now) + hour * 3600000;
  if (at <= now) at += DAY;
  return at;
}

function cleanEntries(input: unknown, month: string): ShiftEntry[] {
  if (!Array.isArray(input)) return [];
  const out: ShiftEntry[] = [];
  for (const e of input.slice(0, 5000)) {
    const date = text(e?.date, 10);
    const name = text(e?.name, 20);
    const shift = normalizeShift(e?.shift);
    if (!DATE.test(date) || !date.startsWith(month) || !name || !shift) continue;
    out.push({ date, name, shift, ...(isDept(e?.dept) ? { dept: e.dept } : {}) });
  }
  return out;
}

export function registerBoard(app: RouteApp, genAI: GoogleGenAI, aiEnabled: boolean) {
  const api = '/api/marton';

  // ---- 첨부 파일 받기 (로그인한 직원) ----
  app.get(`${api}/files/:id`, auth, async (req, res) => {
    const id = req.params.id;
    const owner = db.notices.find(n => n.files?.some(f => f.id === id));
    const file = owner?.files?.find(f => f.id === id);
    if (!FILE_ID.test(id) || !file) return res.status(404).end();
    const bytes = await platform().photos.get(id);
    if (!bytes) return res.status(404).end();
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.type(file.mime).send(bytes);
  });

  // ---- 사진 간단 요약 (실적표·보고 자료) ----
  app.post(`${api}/ai/caption`, auth, managerOnly, async (req, res) => {
    const m = typeof req.body.image === 'string' ? /^data:(image\/[a-z+]+);base64,(.+)$/.exec(req.body.image) : null;
    if (!m) return res.status(400).json({ error: '사진을 첨부해 주세요.' });
    if (!aiEnabled) return res.json({ caption: '' });
    try {
      const r = await genAI.models.generateContent({
        model: AI_MODEL,
        contents: [{ parts: [{ inlineData: { mimeType: m[1], data: m[2] } }, { text:
          '이 사진은 대형마트 점포의 실적표·순위표·보고 자료입니다. 매장 직원이 휴대폰에서 바로 이해하도록 핵심만 한국어로 2~3줄 요약하세요. ' +
          '표 제목과 기간, 1위와 눈에 띄는 수치, "화명점"처럼 강조된 점포가 있으면 그 순위·점수를 넣으세요. 숫자는 사진에 있는 그대로, 없는 내용은 쓰지 마세요. 요약 문장만 출력.' }] }],
      });
      res.json({ caption: (r.text ?? '').trim().slice(0, 300) });
    } catch (e) {
      console.error('MartON caption error:', e);
      res.json({ caption: '' });
    }
  });

  // ---- 월 근무계획 ----
  app.post(`${api}/schedules`, auth, managerOnly, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const month = text(req.body.month, 7);
    if (!MONTH.test(month)) return res.status(400).json({ error: '근무 월을 확인해 주세요.' });
    const entries = cleanEntries(req.body.entries, month);
    if (!entries.length) return res.status(400).json({ error: '근무 내용을 찾지 못했습니다. 양식을 확인해 주세요.' });
    const schedule: WorkSchedule = { month, entries, fileName: text(req.body.fileName, 80) || undefined, uploadedBy: actorOf(me), uploadedAt: Date.now() };
    db.schedules = [...db.schedules.filter(s => s.month !== month), schedule].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
    save();
    broadcast({ type: 'schedule', schedule });
    res.json({ month, entries: entries.length, people: new Set(entries.map(e => e.name)).size });
  });

  // 근무표 사진 → AI로 읽기 (미리보기용, 저장은 위 /schedules)
  app.post(`${api}/ai/schedule`, auth, managerOnly, async (req, res) => {
    const month = text(req.body.month, 7);
    const m = typeof req.body.image === 'string' ? /^data:(image\/[a-z+]+);base64,(.+)$/.exec(req.body.image) : null;
    if (!m || !MONTH.test(month)) return res.status(400).json({ error: '근무표 사진과 월을 확인해 주세요.' });
    if (!aiEnabled) return res.status(503).json({ error: 'AI 키(GEMINI_API_KEY)가 없어 사진 근무표는 읽을 수 없습니다. 엑셀(xlsx)이나 CSV로 올려 주세요.' });
    try {
      const r = await genAI.models.generateContent({
        model: AI_MODEL,
        contents: [{ parts: [{ inlineData: { mimeType: m[1], data: m[2] } }, { text:
          `이 사진은 마트 ${month} 월 근무계획표입니다. 직원별·날짜별 근무를 모두 추출하세요. 근무 표기는 ${SHIFTS.join(', ')} 중 하나로 (1·2·3은 1근·2근·3근, 휴·OFF는 휴무). ` +
          `JSON: {"entries":[{"date":"${month}-01","name":"이름","shift":"1근"}]} 읽을 수 없는 칸은 건너뛰세요.` }] }],
        config: { responseMimeType: 'application/json' },
      });
      res.json({ entries: cleanEntries(parseJson<{ entries?: unknown }>(r.text).entries, month) });
    } catch (e) {
      console.error('MartON schedule AI error:', e);
      res.status(500).json({ error: '근무표 사진을 읽지 못했습니다. 엑셀이나 CSV로 올려 주세요.' });
    }
  });

  // ---- 소비기한 점검 일정 ----
  const scheduleCall = (c: ExpiryCheck) => {
    if (c.at > Date.now() && !c.calledAt) void platform().schedule({ at: c.at, type: 'expiry-call', data: { id: c.id }, key: `expiry-${c.id}` });
  };
  const toDeptAndManagers = (c: ExpiryCheck) => (s: Staff) => s.dept === c.dept || s.role === 'manager';

  app.post(`${api}/expiry`, auth, managerOnly, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 500) : [];
    const saved: ExpiryCheck[] = [];
    for (const it of items) {
      const at = Number(it?.at);
      const area = text(it?.area, 60);
      if (!Number.isFinite(at) || !isDept(it?.dept) || !area) continue;
      const c: ExpiryCheck = {
        id: newId().slice(0, 8), at, dept: it.dept, area, assignee: text(it?.assignee, 20) || undefined, note: text(it?.note, 100) || undefined,
        createdBy: actorOf(me), createdAt: Date.now(),
      };
      db.expiryChecks.push(c);
      scheduleCall(c);
      saved.push(c);
    }
    if (!saved.length) return res.status(400).json({ error: '점검 일정(날짜·시간·파트·구역)을 확인해 주세요.' });
    save();
    for (const dept of new Set(saved.map(c => c.dept))) {
      const mine = saved.filter(c => c.dept === dept);
      broadcast({ type: 'expiry', checks: mine, action: 'saved' }, toDeptAndManagers(mine[0]));
    }
    res.json({ saved: saved.length });
  });

  app.post(`${api}/expiry/:id/done`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const c = db.expiryChecks.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: '점검 일정을 찾을 수 없습니다.' });
    if (c.dept !== me.dept && me.role !== 'manager') return res.status(403).json({ error: '해당 파트만 완료 처리할 수 있습니다.' });
    if (!c.doneAt) { c.doneAt = Date.now(); c.doneBy = actorOf(me); save(); }
    broadcast({ type: 'expiry', checks: [c], action: 'saved' }, toDeptAndManagers(c));
    res.json(c);
  });

  app.post(`${api}/expiry/:id/delete`, auth, managerOnly, (req, res) => {
    const c = db.expiryChecks.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: '점검 일정을 찾을 수 없습니다.' });
    db.expiryChecks = db.expiryChecks.filter(x => x.id !== c.id);
    save();
    broadcast({ type: 'expiry', checks: [c], action: 'deleted' }, toDeptAndManagers(c));
    res.json({ ok: true });
  });

  // 점검 시각이 되면 해당 파트 호출 (호출음 + "OO 담당님 호출입니다. 소비기한 점검 시간입니다")
  onJob('expiry-call', ({ id }: { id: string }) => {
    const c = db.expiryChecks.find(x => x.id === id);
    if (!c || c.calledAt || c.doneAt) return;
    c.calledAt = Date.now();
    save();
    broadcast({ type: 'expiry', checks: [c], action: 'call' }, toDeptAndManagers(c));
  });

  // ---- 생일 축하: 매일 오전 9시(매장 기준) 생일인 직원에게 ----
  onJob('birthday-tick', () => {
    const year = storeTime(Date.now()).year;
    db.birthdayDone ??= {};
    for (const s of Object.values(db.staff)) {
      if (!isBirthdayToday(s.birthday) || db.birthdayDone[s.id] === year) continue;
      db.birthdayDone[s.id] = year;
      broadcast({ type: 'birthday', staffId: s.id, name: s.name }, x => x.id === s.id);
    }
    save();
    void platform().schedule({ at: nextStoreHour(9), type: 'birthday-tick', key: 'birthday-tick' });
  });
  void platform().schedule({ at: nextStoreHour(9), type: 'birthday-tick', key: 'birthday-tick' });
}

/** 지난 점검 일정(30일 지난 것) 정리 */
export function pruneBoard() {
  const cutoff = Date.now() - 30 * DAY;
  db.expiryChecks = db.expiryChecks.filter(c => c.at > cutoff);
}

export { birthdayMessage };
