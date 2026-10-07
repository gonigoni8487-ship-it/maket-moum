// 마트ON 보안/손실방지: 직원 신고, 센서·CCTV 연동 경보, 대응 기록, 손실 분석
import type { Express, Request, Response } from 'express';
import type { GoogleGenAI } from '@google/genai';
import { randomUUID, timingSafeEqual } from 'crypto';
import {
  INCIDENT_TYPES, INCIDENT_STATUSES, INCIDENT_OUTCOMES, canSeeIncident, canHandleIncident, lossStats, zoneDept,
  type Actor, type Incident, type IncidentStatus, type IncidentType, type LossInsight, type LossStats,
} from '../src/marton/shared';
import { db, save, broadcast, auth, managerOnly, actorOf, text, parseJson, type AuthedRequest } from './marton';

const AI_MODEL = 'gemini-3.5-flash';
const INTEGRATION_KEY = process.env.MARTON_INTEGRATION_KEY || '';
const DAY = 24 * 60 * 60 * 1000;

function publish(incident: Incident, action: 'created' | 'updated') {
  // 구역 부서는 종결 소식까지 받아야 진행 중 목록에서 지울 수 있다
  broadcast({ type: 'incident', incident, action }, s => canSeeIncident(s, incident) || s.dept === incident.dept);
}

function createIncident(input: {
  type: IncidentType; source: Incident['source']; urgent: boolean; zone: string; reportedBy: Actor;
  productName?: string; quantity?: number; unitPrice?: number; cctvRef?: string; note: string;
  sensorId?: string; test?: boolean; occurredAt?: number;
}) {
  const now = Date.now();
  const quantity = input.quantity && input.quantity > 0 ? Math.min(input.quantity, 999) : undefined;
  const unitPrice = input.unitPrice && input.unitPrice > 0 ? input.unitPrice : undefined;
  const incident: Incident = {
    id: randomUUID().slice(0, 8),
    ...input,
    quantity,
    unitPrice,
    dept: zoneDept(input.zone),
    estimatedLoss: (quantity ?? 1) * (unitPrice ?? 0),
    status: '접수',
    occurredAt: input.occurredAt && input.occurredAt <= now && input.occurredAt > now - 7 * DAY ? input.occurredAt : now,
    createdAt: now,
    updatedAt: now,
    history: [{ status: '접수', by: input.reportedBy, at: now }],
  };
  db.incidents.push(incident);
  save();
  publish(incident, 'created');
  return incident;
}

function keyMatches(given: string | undefined) {
  if (!INTEGRATION_KEY || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(INTEGRATION_KEY);
  return a.length === b.length && timingSafeEqual(a, b);
}

function ruleInsight(s: LossStats): LossInsight {
  const hours = s.byHour.map((n, h) => [h, n] as const).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const actions: string[] = [];
  if (s.byZone[0]) actions.push(`${s.byZone[0][0]} 구역 순찰·고객 응대 인사("도와드릴까요?") 강화 — 최근 ${s.byZone[0][1]}건으로 가장 많음`);
  if (hours.length) actions.push(`${hours.map(([h]) => `${h}시`).join(', ')} 전후 순찰 인원 배치`);
  if (s.byProduct[0]) actions.push(`${s.byProduct[0][0]}: 계산대 근처 진열, 잠금 진열장, 더미 진열 등 진열 방식 검토`);
  if (s.total && s.falseAlarm / s.total > 0.4) actions.push('오인 신고 비율이 높음 — 신고 기준과 대응 수칙 재교육');
  if (s.avgAckMs && s.avgAckMs > 3 * 60 * 1000) actions.push('경보 확인까지 평균 3분 초과 — 보안 담당 알림 수신 상태 점검');
  return {
    summary: s.total ? `최근 기간 신고 ${s.total}건, 손실 확인 ${s.confirmed}건(추정 ${s.loss.toLocaleString()}원).` : '분석할 신고 데이터가 아직 없습니다.',
    actions,
    source: 'rules',
  };
}

export function registerSecurity(app: Express, genAI: GoogleGenAI, aiEnabled: boolean) {
  const api = '/api/marton';

  // 직원 현장 신고
  app.post(`${api}/incidents`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const { type } = req.body;
    const zone = text(req.body.zone, 40);
    if (!INCIDENT_TYPES.includes(type) || type === '센서 경보' || !zone) return res.status(400).json({ error: '유형과 위치를 선택해 주세요.' });
    res.json(createIncident({
      type, source: 'staff', urgent: Boolean(req.body.urgent), zone, reportedBy: actorOf(me),
      productName: text(req.body.productName, 60) || undefined,
      quantity: Number(req.body.quantity) || undefined,
      unitPrice: Number(req.body.unitPrice) || undefined,
      cctvRef: text(req.body.cctvRef, 60) || undefined,
      note: text(req.body.note, 500),
      occurredAt: Number(req.body.occurredAt) || undefined,
    }));
  });

  app.post(`${api}/incidents/:id/status`, auth, (req, res) => {
    const me = (req as AuthedRequest).staff;
    if (!canHandleIncident(me)) return res.status(403).json({ error: '보안(MS) 담당 또는 관리자만 처리할 수 있습니다.' });
    const incident = db.incidents.find(i => i.id === req.params.id);
    if (!incident) return res.status(404).json({ error: '신고를 찾을 수 없습니다.' });
    const status = req.body.status as IncidentStatus;
    if (!INCIDENT_STATUSES.includes(status) || INCIDENT_STATUSES.indexOf(status) <= INCIDENT_STATUSES.indexOf(incident.status)) {
      return res.status(400).json({ error: '이미 처리된 단계입니다.' });
    }
    if (status === '종결') {
      if (!INCIDENT_OUTCOMES.includes(req.body.outcome)) return res.status(400).json({ error: '종결 결과를 선택해 주세요.' });
      incident.outcome = req.body.outcome;
      // 종결 시 실제 손실 수량/단가를 정정할 수 있다
      if (Number(req.body.quantity) > 0) incident.quantity = Number(req.body.quantity);
      if (Number(req.body.unitPrice) > 0) incident.unitPrice = Number(req.body.unitPrice);
      incident.estimatedLoss = (incident.quantity ?? 1) * (incident.unitPrice ?? 0);
    }
    const now = Date.now();
    incident.status = status;
    incident.updatedAt = now;
    incident.history.push({ status, by: actorOf(me), at: now, note: text(req.body.note, 200) || undefined });
    save();
    publish(incident, 'updated');
    res.json(incident);
  });

  // CCTV 분석기·EAS 게이트·진열대 센서 등 외부 시스템 연동 (웹훅)
  // POST /api/marton/integrations/alerts  헤더 X-MartON-Key: <MARTON_INTEGRATION_KEY>
  // { "sensorId": "EAS-1", "zone": "출입구/EAS 게이트", "message": "EAS 태그 감지", "productName"?: "...", "urgent"?: true }
  app.post(`${api}/integrations/alerts`, (req: Request, res: Response) => {
    if (!INTEGRATION_KEY) return res.status(503).json({ error: 'MARTON_INTEGRATION_KEY가 설정되지 않아 연동이 비활성화되어 있습니다.' });
    if (!keyMatches(req.header('x-marton-key'))) return res.status(401).json({ error: 'invalid key' });
    const sensorId = text(req.body.sensorId, 40);
    const zone = text(req.body.zone, 40);
    if (!sensorId || !zone) return res.status(400).json({ error: 'sensorId, zone은 필수입니다.' });
    const incident = createIncident({
      type: '센서 경보', source: 'sensor', urgent: req.body.urgent !== false, zone, sensorId,
      reportedBy: { id: `sensor:${sensorId}`, name: sensorId, dept: 'MS' },
      productName: text(req.body.productName, 60) || undefined,
      cctvRef: text(req.body.cctvRef, 60) || undefined,
      note: text(req.body.message, 300),
    });
    res.json({ id: incident.id });
  });

  // 관리자: 알림 경로 점검용 센서 경보 (분석 제외)
  app.post(`${api}/incidents/sensor-test`, auth, managerOnly, (req, res) => {
    const zone = text(req.body.zone, 40) || '출입구/EAS 게이트';
    res.json(createIncident({
      type: '센서 경보', source: 'sensor', urgent: true, zone, sensorId: 'TEST', test: true,
      reportedBy: { id: 'sensor:TEST', name: '테스트 센서', dept: 'MS' },
      note: '연동 점검용 테스트 경보입니다. 확인 후 종결해 주세요.',
    }));
  });

  // 관리자: 손실 패턴 분석과 예방 조치 제안
  app.post(`${api}/ai/loss-insight`, auth, managerOnly, async (req, res) => {
    const days = Math.min(Math.max(Number(req.body.days) || 30, 1), 180);
    const stats = lossStats(db.incidents, Date.now() - days * DAY);
    const fallback = ruleInsight(stats);
    if (!aiEnabled || !stats.total) return res.json(fallback);
    try {
      const response = await genAI.models.generateContent({
        model: AI_MODEL,
        contents: [{ parts: [{ text: `당신은 대형마트 손실방지(LP) 컨설턴트입니다. 아래는 최근 ${days}일간 매장 도난·의심 신고 집계입니다(개인 정보 없음).
특정 고객층을 의심하거나 개인을 식별하는 조치는 제안하지 말고, 진열·동선·인력배치·응대·시스템 개선 중심으로 제안하세요.
JSON으로만 답하세요: {"summary":"핵심 패턴 2~3문장","actions":["실행 가능한 조치 3~5개, 구역·시간·상품을 구체적으로"]}

${JSON.stringify(stats)}` }] }],
        config: { responseMimeType: 'application/json' },
      });
      const raw = parseJson<{ summary?: string; actions?: string[] }>(response.text);
      res.json({ summary: raw.summary || fallback.summary, actions: Array.isArray(raw.actions) ? raw.actions.slice(0, 6) : fallback.actions, source: 'ai' } satisfies LossInsight);
    } catch (error) {
      console.error('MartON loss insight error:', error);
      res.json(fallback);
    }
  });
}
