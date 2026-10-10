// 마트ON 보안 점검: 관리자 화면의 "보안 점검" — 설정 상태, 로그인 실패 기록, 모든 기기 로그아웃
import { db, save, auth, managerOnly, securityLog, SESSION_MAX_MS, pinStrength, managerPinSource, checkManagerPin, storeManagerPin, MIN_PIN_LENGTH, type AuthedRequest, type RouteApp } from './marton';
import { platform } from './platform';

const DAY = 24 * 60 * 60 * 1000;

export interface SecurityStatus {
  checkedAt: number;
  storeCodeSet: boolean;
  pin: 'none' | 'weak' | 'fair' | 'strong';
  /** env: Cloudflare 비밀, app: 앱에서 만든 비밀번호 */
  pinSource: 'env' | 'app' | 'none';
  pushKeys: boolean;
  integrationKeySet: boolean;
  /** 로그인되어 있는 기기 수 */
  sessions: number;
  /** 지난 24시간 로그인 실패 */
  failures24h: number;
  /** 지난 24시간 차단된 횟수 */
  locked24h: number;
  log: { at: number; type: string; detail: string }[];
  sessionDays: number;
}

export function registerGuard(app: RouteApp) {
  const api = '/api/marton';

  app.get(`${api}/security/status`, auth, managerOnly, (_req, res) => {
    const since = Date.now() - DAY;
    const log = db.securityLog ?? [];
    const status: SecurityStatus = {
      checkedAt: Date.now(),
      storeCodeSet: Boolean(platform().env('MARTON_STORE_CODE')),
      pin: managerPinSource() === 'app' ? db.managerPin!.strength : pinStrength(platform().env('MARTON_MANAGER_PIN') || ''),
      pinSource: managerPinSource(),
      pushKeys: Boolean(db.vapid),
      integrationKeySet: Boolean(platform().env('MARTON_INTEGRATION_KEY')),
      sessions: Object.keys(db.sessions).length,
      failures24h: log.filter(l => l.at > since && (l.type === 'pin-fail' || l.type === 'store-fail' || l.type === 'manager-blocked')).length,
      locked24h: log.filter(l => l.at > since && l.type === 'locked').length,
      log: log.slice(-30).reverse(),
      sessionDays: SESSION_MAX_MS / DAY,
    };
    res.json(status);
  });

  // 관리자 비밀번호 바꾸기 (앱에서 만든 비밀번호일 때만 — Cloudflare 비밀이 있으면 그쪽에서 바꾼다)
  app.post(`${api}/security/pin`, auth, managerOnly, async (req, res) => {
    const me = (req as AuthedRequest).staff;
    if (managerPinSource() === 'env') return res.status(409).json({ error: '관리자 비밀번호가 Cloudflare 설정(MARTON_MANAGER_PIN)에 있습니다. Cloudflare에서 바꿔 주세요.' });
    if (!(await checkManagerPin(req.body.current))) {
      securityLog('pin-fail', `${me.name}(${me.id}) — 비밀번호 바꾸기: 지금 비밀번호 틀림`);
      return res.status(403).json({ error: '지금 비밀번호가 맞지 않습니다.' });
    }
    const next = typeof req.body.next === 'string' ? req.body.next : '';
    if (next.length < MIN_PIN_LENGTH || next.length > 64) return res.status(400).json({ error: `새 비밀번호는 ${MIN_PIN_LENGTH}자 이상으로 정해 주세요.` });
    await storeManagerPin(next);
    securityLog('pin-change', `${me.title ?? ''} ${me.name} — 관리자 비밀번호 바꿈`);
    res.json({ ok: true, strength: db.managerPin!.strength });
  });

  // 휴대폰을 잃어버렸거나 의심스러운 로그인이 있을 때: 내 기기만 남기고 모두 로그아웃
  app.post(`${api}/security/logout-all`, auth, managerOnly, (req, res) => {
    const me = (req as AuthedRequest).staff;
    const mine = req.headers.authorization?.slice(7);
    let removed = 0;
    for (const t of Object.keys(db.sessions)) {
      if (t === mine) continue;
      delete db.sessions[t];
      delete db.sessionAt?.[t];
      removed++;
    }
    // 푸시도 끊어 잃어버린 휴대폰에 알림이 가지 않게
    db.pushSubs = db.pushSubs.filter(s => s.staffId === me.id);
    securityLog('logout-all', `${me.title ?? ''} ${me.name} — 기기 ${removed}대 로그아웃`);
    save();
    res.json({ removed });
  });
}
