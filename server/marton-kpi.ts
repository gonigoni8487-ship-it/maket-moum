// 마트ON 실적 지표: 영업부서별 일·월·년 실적 저장, 사진 자동 입력, 열람 권한 (영업기밀 — 관리자·승인된 시니어만)
import type { GoogleGenAI } from '@google/genai';
import { FIGURE_FIELDS, PERIOD_FORMAT, SALES_DEPTS, canSeeKpi, lastYearFromGrowth, type KpiFigures, type KpiPeriod, type KpiRecord, type SalesDept } from '../src/marton/kpi';
import type { Staff } from '../src/marton/shared';
import { db, save, broadcast, auth, managerOnly, actorOf, newId, securityLog, type AuthedRequest, type RouteApp } from './marton';
import type { Request, Response, NextFunction } from 'express';

const AI_MODEL = 'gemini-3.5-flash';
const MAX_AMOUNT = 1e13; // 10조원 넘는 값은 잘못 읽은 것으로 본다

export const kpiAllowed = (s: Staff) => canSeeKpi(s, db.kpiAccess ?? []);
function kpiOnly(req: Request, res: Response, next: NextFunction) {
  if (!kpiAllowed((req as AuthedRequest).staff)) return res.status(403).json({ error: '실적 지표는 점장·부점장과 승인받은 시니어 담당만 볼 수 있습니다.' });
  next();
}

const isSalesDept = (d: unknown): d is SalesDept => SALES_DEPTS.includes(d as SalesDept);
const isPeriod = (p: unknown): p is KpiPeriod => p === 'day' || p === 'month' || p === 'year';
const amount = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[,\s원]/g, '')) : NaN;
  return Number.isFinite(n) && Math.abs(n) < MAX_AMOUNT ? Math.round(n) : undefined;
};
/** 들어온 값 정리. 신장율(%)만 있으면 전년실적 = 순매출 × 100 ÷ (100 + 신장율) */
export function cleanFigures(input: any): KpiFigures | null {
  if (!input || typeof input !== 'object') return null;
  const out: KpiFigures = {};
  for (const { key } of FIGURE_FIELDS) {
    const v = amount(input[key]);
    if (v !== undefined) out[key] = v;
  }
  const growth = typeof input.growth === 'number' ? input.growth : Number(String(input.growth ?? '').replace(/[%\s+]/g, ''));
  if (out.lastYear === undefined && out.net !== undefined && Number.isFinite(growth) && growth > -100 && String(input.growth ?? '') !== '') out.lastYear = lastYearFromGrowth(out.net, growth);
  return Object.keys(out).length ? out : null;
}

export function registerKpi(app: RouteApp, genAI: GoogleGenAI, aiEnabled: boolean) {
  const api = '/api/marton';

  app.get(`${api}/kpi`, auth, kpiOnly, (_req, res) => {
    res.json({ records: db.kpi ?? [] });
  });

  // 저장: 같은 기간·부서는 고쳐 쓴다
  app.post(`${api}/kpi`, auth, kpiOnly, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const list = Array.isArray(req.body.records) ? req.body.records.slice(0, 60) : [];
    const saved: KpiRecord[] = [];
    for (const r of list) {
      if (!isPeriod(r?.period) || typeof r.key !== 'string' || !PERIOD_FORMAT[r.period as KpiPeriod].test(r.key) || !isSalesDept(r.dept)) continue;
      const figures = cleanFigures(r.figures);
      if (!figures) continue;
      db.kpi ??= [];
      const i = db.kpi.findIndex(x => x.period === r.period && x.key === r.key && x.dept === r.dept);
      const rec: KpiRecord = { id: i >= 0 ? db.kpi[i].id : newId().slice(0, 8), period: r.period, key: r.key, dept: r.dept, figures, by: actorOf(me), at: Date.now(), source: r.source === 'photo' ? 'photo' : 'manual' };
      if (i >= 0) db.kpi[i] = rec; else db.kpi.push(rec);
      saved.push(rec);
    }
    if (!saved.length) return res.status(400).json({ error: '저장할 실적이 없습니다. 기간·부서·금액을 확인해 주세요.' });
    save();
    broadcast({ type: 'kpi', records: saved, action: 'saved' }, kpiAllowed);
    res.json({ saved: saved.length, records: saved });
  });

  app.post(`${api}/kpi/:id/delete`, auth, managerOnly, (req, res) => {
    const rec = db.kpi?.find(r => r.id === req.params.id);
    if (!rec) return res.status(404).json({ error: '실적을 찾을 수 없습니다.' });
    db.kpi = db.kpi!.filter(r => r !== rec);
    save();
    broadcast({ type: 'kpi', records: [rec], action: 'deleted' }, kpiAllowed);
    res.json({ ok: true });
  });

  // 사진(실적 보고서·POS 화면)을 읽어 부서별 금액을 채운다
  app.post(`${api}/ai/kpi`, auth, kpiOnly, async (req, res) => {
    const m = typeof req.body.image === 'string' ? /^data:(image\/[a-z+]+);base64,(.+)$/.exec(req.body.image) : null;
    if (!m) return res.status(400).json({ error: '사진을 첨부해 주세요.' });
    if (!aiEnabled) return res.status(503).json({ error: 'AI 키(GEMINI_API_KEY)가 설정되지 않아 사진 자동 입력을 쓸 수 없습니다. 직접 입력해 주세요.' });
    try {
      const r = await genAI.models.generateContent({
        model: AI_MODEL,
        config: { responseMimeType: 'application/json' },
        contents: [{ parts: [{ inlineData: { mimeType: m[1], data: m[2] } }, { text:
          '이 사진은 대형마트 점포의 영업 실적표(일보·월보·POS 화면)입니다. 부서별 금액을 읽어 JSON으로만 답하세요.\n' +
          `부서는 ${SALES_DEPTS.join('·')} 중 하나로 맞추세요 (예: 신선수산→수산, 정육→축산, 과일·채소→농산, 그로서리·식품→가공, 생활·리빙·문화→생활문화). 합계·전체 행은 빼세요.\n` +
          '금액은 원 단위 정수로 바꾸세요 (표가 천원·백만원 단위면 곱해서 원으로). 사진에 없는 항목은 넣지 마세요. 비율(%)은 신장율만 growth에 숫자로.\n' +
          '{"period":"day|month|year 중 표의 기간","date":"YYYY-MM-DD 또는 YYYY-MM 또는 YYYY (보이면)","rows":[{"dept":"수산","gross":총매출,"net":순매출,"target":목표,"lastYear":전년실적,"growth":신장율,"profit":이익액,"waste":폐기금액,"loss":로스금액,"tasting":시식금액,"markdown":할인에누리액}]}' }] }],
      });
      let parsed: any;
      try { parsed = JSON.parse((r.text ?? '').replace(/^```(?:json)?|```$/g, '').trim()); } catch { parsed = null; }
      const rows = (Array.isArray(parsed?.rows) ? parsed.rows : []).flatMap((row: any) => {
        const figures = cleanFigures(row);
        return isSalesDept(row?.dept) && figures ? [{ dept: row.dept, figures }] : [];
      });
      if (!rows.length) return res.status(422).json({ error: '사진에서 부서별 실적을 읽지 못했습니다. 표가 잘 보이게 다시 찍거나 직접 입력해 주세요.' });
      const period = isPeriod(parsed?.period) ? parsed.period : undefined;
      const key = period && typeof parsed?.date === 'string' && PERIOD_FORMAT[period as KpiPeriod].test(parsed.date) ? parsed.date : undefined;
      res.json({ period, key, rows });
    } catch (e) {
      console.error('MartON kpi photo error:', e);
      res.status(502).json({ error: '사진 분석에 실패했습니다. 잠시 후 다시 시도하거나 직접 입력해 주세요.' });
    }
  });

  // ---- 열람 권한: 점장·부점장이 시니어 담당에게 허락 ----
  app.get(`${api}/kpi/access`, auth, managerOnly, (_req, res) => {
    const approved = db.kpiAccess ?? [];
    const list = Object.values(db.staff)
      .filter(s => s.role !== 'manager')
      .map(s => ({ id: s.id, name: s.name, dept: s.dept, rank: s.rank, level: s.level, allowed: canSeeKpi(s, approved), approved: approved.includes(s.id) }))
      .sort((a, b) => (a.level === '시니어' ? 0 : 1) - (b.level === '시니어' ? 0 : 1) || a.dept.localeCompare(b.dept) || a.name.localeCompare(b.name));
    res.json(list);
  });
  app.post(`${api}/kpi/access`, auth, managerOnly, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const id = typeof req.body.staffId === 'string' ? req.body.staffId : '';
    const target = Object.hasOwn(db.staff, id) ? db.staff[id] : undefined;
    if (!target) return res.status(404).json({ error: '직원을 찾을 수 없습니다.' });
    if (req.body.allow && target.level !== '시니어') return res.status(400).json({ error: '주니어 담당은 실적 지표를 볼 수 없습니다. 시니어 담당만 허락할 수 있습니다.' });
    const set = new Set(db.kpiAccess ?? []);
    if (req.body.allow) set.add(id); else set.delete(id);
    db.kpiAccess = [...set];
    securityLog('kpi-access', `${me.name} → ${target.name}(${target.dept}) 실적 지표 ${req.body.allow ? '허락' : '취소'}`);
    save();
    res.json({ ok: true, allowed: canSeeKpi(target, db.kpiAccess) });
  });
}
