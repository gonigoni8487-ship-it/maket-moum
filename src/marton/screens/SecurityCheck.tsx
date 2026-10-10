import { useEffect, useState } from 'react';
import { CheckCircle2, LogOut, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { api } from '../api';
import { cx, Section } from '../ui';

interface Status {
  checkedAt: number; storeCodeSet: boolean; pin: 'none' | 'weak' | 'fair' | 'strong'; pushKeys: boolean; integrationKeySet: boolean;
  sessions: number; failures24h: number; locked24h: number; sessionDays: number; pinSource?: 'env' | 'app' | 'none';
  log: { at: number; type: string; detail: string }[];
}

const LOG_LABEL: Record<string, string> = {
  'pin-fail': '관리자 비밀번호 틀림', 'store-fail': '매장 코드 틀림', locked: '접속 차단', 'manager-login': '관리자 로그인',
  'manager-blocked': '관리자 사번 도용 시도', 'logout-all': '전체 로그아웃', 'pin-setup': '관리자 비밀번호 만듦', 'pin-change': '관리자 비밀번호 바꿈',
};
const PIN_TEXT = { none: '설정 안 됨 — 관리자 로그인이 막혀 있습니다', weak: '약함 — 8자 이상, 영문·숫자·기호를 섞어 주세요', fair: '보통 — 8자 이상, 영문·숫자·기호를 모두 섞으면 더 안전합니다', strong: '강함' };
const when = (t: number) => new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function Row({ ok, title, children }: { ok: boolean; title: string; children: string }) {
  return (
    <li className="flex items-start gap-2.5">
      {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />}
      <span className="min-w-0"><span className="block text-sm font-bold text-slate-900">{title}</span><span className={cx('block text-xs', ok ? 'text-slate-500' : 'text-amber-700')}>{children}</span></span>
    </li>
  );
}

/** 점장·부점장: 보안 점검 — 설정 상태와 로그인 실패 기록, 모든 기기 로그아웃 */
export default function SecurityCheck({ onError, onToast }: { onError: (m: string) => void; onToast: (m: string) => void }) {
  const [s, setS] = useState<Status | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pinForm, setPinForm] = useState<{ current: string; next: string; again: string } | null>(null);
  const changePin = async () => {
    if (!pinForm) return;
    if (pinForm.next.length < 6) return onError('새 비밀번호는 6자 이상으로 정해 주세요.');
    if (pinForm.next !== pinForm.again) return onError('새 비밀번호 확인이 맞지 않습니다.');
    setBusy(true);
    try {
      await api('/security/pin', { current: pinForm.current, next: pinForm.next });
      setPinForm(null);
      onToast('관리자 비밀번호를 바꿨습니다. 다른 점장·부점장님께도 알려 주세요.');
      void load();
    } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };
  const load = () => api<Status>('/security/status').then(setS, e => onError((e as Error).message));
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logoutAll = async () => {
    setBusy(true);
    try {
      const r = await api<{ removed: number }>('/security/logout-all', {});
      onToast(`내 기기를 빼고 ${r.removed}대를 로그아웃했습니다. 직원들은 다시 로그인하면 됩니다.`);
      setConfirm(false);
      void load();
    } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };

  const warnings = s ? [!s.storeCodeSet, s.pin !== 'strong', s.failures24h >= 5].filter(Boolean).length : 0;
  return (
    <Section title="보안 점검" right={<button onClick={() => void load()} className="flex items-center gap-1 text-xs font-bold text-slate-500"><RefreshCw className="size-3.5" />다시 점검</button>}>
      <div className="space-y-4 rounded-2xl bg-white p-4">
        {!s ? <p className="text-sm text-slate-500">점검 중…</p> : (
          <>
            <div className={cx('flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold', warnings ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800')}>
              <ShieldCheck className="size-5" />{warnings ? `확인이 필요한 항목 ${warnings}개` : '모든 항목 안전'}
              <span className="ml-auto text-xs font-normal opacity-70">{when(s.checkedAt)} 점검</span>
            </div>
            <ul className="space-y-3">
              <Row ok={s.storeCodeSet} title="매장 접속 코드">{s.storeCodeSet ? '설정됨 — 코드를 아는 직원만 들어올 수 있습니다' : '없음 — 주소만 알면 누구나 직원처럼 들어올 수 있습니다. Cloudflare에 MARTON_STORE_CODE를 넣어 주세요'}</Row>
              <Row ok={s.pin === 'strong'} title="관리자 비밀번호">{`${PIN_TEXT[s.pin]}${s.pinSource === 'env' ? ' · Cloudflare 설정에서 관리' : s.pinSource === 'app' ? ' · 앱에서 만든 비밀번호' : ''}`}</Row>
              <Row ok={s.failures24h < 5} title="지난 24시간 로그인 실패">{`${s.failures24h}건${s.locked24h ? ` · 접속 차단 ${s.locked24h}번` : ''}${s.failures24h >= 5 ? ' — 비밀번호를 맞히려는 시도일 수 있습니다. 아래 기록을 확인해 주세요' : ''}`}</Row>
              <Row ok title="자동 로그아웃">{`로그인 후 ${s.sessionDays}일이 지나면 다시 로그인해야 합니다 · 지금 로그인된 기기 ${s.sessions}대`}</Row>
              <Row ok title="비밀번호 대입 막기">같은 곳에서 10분에 20번 틀리면 10분간 차단합니다</Row>
            </ul>

            {s.log.length > 0 && (
              <details className="rounded-xl bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-bold text-slate-700">최근 보안 기록 {s.log.length}건</summary>
                <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-xs text-slate-600">
                  {s.log.map((l, i) => (
                    <li key={i} className="grid grid-cols-[5.5rem_1fr] gap-2">
                      <span className="tabular-nums text-slate-400">{when(l.at)}</span>
                      <span className={cx(l.type !== 'manager-login' && 'text-amber-700')}><b>{LOG_LABEL[l.type] ?? l.type}</b> · {l.detail}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {s.pinSource === 'app' && (pinForm ? (
              <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-bold text-slate-800">관리자 비밀번호 바꾸기</p>
                {(['current', 'next', 'again'] as const).map(k => (
                  <input key={k} type="password" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label={{ current: '지금 비밀번호', next: '새 비밀번호', again: '새 비밀번호 확인' }[k]}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[15px]" value={pinForm[k]} onChange={e => setPinForm({ ...pinForm, [k]: e.target.value })}
                    placeholder={{ current: '지금 비밀번호', next: '새 비밀번호 (8자 이상, 영문·숫자·기호 섞기 권장)', again: '새 비밀번호 한 번 더' }[k]} />
                ))}
                <div className="grid grid-cols-2 gap-2 text-sm font-bold">
                  <button onClick={() => setPinForm(null)} className="rounded-lg bg-white py-2.5 text-slate-700">취소</button>
                  <button onClick={changePin} disabled={busy} className="rounded-lg bg-blue-600 py-2.5 text-white disabled:opacity-50">바꾸기</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setPinForm({ current: '', next: '', again: '' })} className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700">🔑 관리자 비밀번호 바꾸기</button>
            ))}

            {confirm ? (
              <div className="space-y-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                <p>내 기기를 빼고 <b>모든 직원 휴대폰이 로그아웃</b>되고 푸시 알림도 끊깁니다. 휴대폰을 잃어버렸거나 모르는 로그인이 있을 때 쓰세요.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setConfirm(false)} className="rounded-lg bg-white py-2.5 font-bold text-slate-700">취소</button>
                  <button onClick={logoutAll} disabled={busy} className="rounded-lg bg-red-600 py-2.5 font-bold text-white disabled:opacity-50">{busy ? '처리 중…' : '모두 로그아웃'}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirm(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700"><LogOut className="size-4" />내 기기 빼고 모두 로그아웃</button>
            )}
          </>
        )}
      </div>
    </Section>
  );
}
