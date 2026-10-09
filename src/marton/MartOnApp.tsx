import { useCallback, useEffect, useRef, useState } from 'react';
import { ClipboardList, Send, Search, Camera, Megaphone, LayoutDashboard, Settings, Siren, X, ShieldAlert, Mic } from 'lucide-react';
import { canHandleIncident, noticeSpeech, type Bootstrap, type Incident, type Notice, type Staff, type StreamEvent, type Task } from './shared';
import { api, ApiError, bootstrap, connectStream, session } from './api';
import { alert, callPhrase, loadPrefs, onSoundReady, registerServiceWorker, savePrefs, soundReady, startSiren, stopAlarm, unlockAudio, type AlertPrefs } from './alerts';
import { cx, type Draft } from './ui';
import { clearOutbox, flush, onOutboxChange, pendingItems, send } from './outbox';
import { detachPush, enablePush, pushState, PUSH_LABEL, type PushState } from './push';
import Login from './screens/Login';
import TaskBoard, { advance } from './screens/TaskBoard';
import RequestForm from './screens/RequestForm';
import ProductFinder from './screens/ProductFinder';
import PhotoAI from './screens/PhotoAI';
import Notices from './screens/Notices';
import Manager from './screens/Manager';
import Security from './screens/Security';
import VoiceRequest from './screens/VoiceRequest';
import { HandoverInbox, HandoverSheet } from './screens/Handover';

const CACHE_KEY = 'marton-cache';

type Tab = 'tasks' | 'request' | 'find' | 'photo' | 'notices' | 'security' | 'manager';
type Urgent = { kind: 'task'; task: Task } | { kind: 'notice'; notice: Notice } | { kind: 'incident'; incident: Incident };

function usePwaHead() {
  useEffect(() => {
    const added: HTMLElement[] = [];
    const add = (tag: string, attrs: Record<string, string>) => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      added.push(el);
    };
    // 운영 서버는 HTML에 이미 넣어 보내므로 없을 때(개발 서버)만 추가
    if (!document.querySelector('link[rel="manifest"]')) {
      add('link', { rel: 'manifest', href: '/marton/manifest.webmanifest' });
      add('meta', { name: 'theme-color', content: '#1d4ed8' });
      add('link', { rel: 'apple-touch-icon', href: '/marton/apple-touch-icon.png' });
    }
    const prevTitle = document.title;
    document.title = '마트ON';
    registerServiceWorker();
    return () => { added.forEach(el => el.remove()); document.title = prevTitle; };
  }, []);
}

const upsert = <T extends { id: string }>(list: T[], item: T) => {
  const i = list.findIndex(x => x.id === item.id);
  return i < 0 ? [...list, item] : list.map(x => (x.id === item.id ? item : x));
};

export default function MartOnApp() {
  usePwaHead();
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(Boolean(session.token));
  const [connected, setConnected] = useState(false);
  // 홈 화면 바로가기: /marton/?tab=security, /marton/?voice=1
  const params = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState<Tab>(() => {
    const t = params.get('tab') as Tab | null;
    return t && ['tasks', 'request', 'find', 'photo', 'notices', 'security', 'manager'].includes(t) ? t : 'tasks';
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [urgent, setUrgent] = useState<Urgent | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [prefs, setPrefs] = useState<AlertPrefs>(loadPrefs);
  const [showSettings, setShowSettings] = useState(false);
  const [push, setPush] = useState<PushState>('off');
  const [soundOk, setSoundOk] = useState(soundReady);
  useEffect(() => onSoundReady(setSoundOk), []);
  const [voiceOpen, setVoiceOpen] = useState(() => params.get('voice') === '1');
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [pending, setPending] = useState(() => pendingItems().length);
  const [netOnline, setNetOnline] = useState(() => navigator.onLine !== false);
  const [stale, setStale] = useState(false); // 오프라인이라 저장해 둔 화면을 보여주는 중

  const meRef = useRef<Staff | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const prefsRef = useRef(prefs);
  meRef.current = data?.me ?? null;
  prefsRef.current = prefs;

  const showToast = useCallback((msg: string, error = false) => {
    setToast({ msg, error });
    window.setTimeout(() => setToast(t => (t?.msg === msg ? null : t)), 3500);
  }, []);
  const onError = useCallback((m: string) => showToast(m, true), [showToast]);

  const logout = useCallback(async () => {
    if (pendingItems().length) await flush();
    const left = pendingItems().length;
    if (left && !window.confirm(`아직 보내지 못한 ${left}건이 있습니다. 로그아웃하면 이 기기에서 삭제됩니다. 계속할까요?`)) return;
    clearOutbox();
    try { localStorage.removeItem(CACHE_KEY); } catch { /* 무시 */ }
    await detachPush();
    void api('/logout', {}).catch(() => {});
    session.set(null);
    stopAlarm();
    setData(null);
    setShowSettings(false);
  }, []);

  const load = useCallback(async () => {
    try {
      const fresh = await bootstrap();
      setData(fresh);
      setStale(false);
      // 오프라인 재실행용 화면 캐시 (보안 신고·순찰·리포트는 기기에 남기지 않음)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ token: session.token, data: { ...fresh, incidents: [], patrols: [], reports: [] } })); } catch { /* 무시 */ }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) session.set(null);
      else {
        const cached = (() => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; } })();
        if (cached?.token === session.token) {
          setData(d => d ?? cached.data);
          setStale(true);
        } else onError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { if (session.token) void load(); }, [load]);

  const handleEvent = useCallback((e: StreamEvent) => {
    const me = meRef.current;
    if (!me) return;
    const p = prefsRef.current;

    if (e.type === 'presence') return setData(d => d && { ...d, online: e.online });
    if (e.type === 'promotion') return setData(d => d && { ...d, promotions: upsert(d.promotions, e.promotion) });

    if (e.type === 'notice') {
      const n = e.notice;
      const relevant = n.scope === 'all' || n.scope === me.dept;
      const isNew = !dataRef.current?.notices.some(x => x.id === n.id);
      if (isNew && relevant && n.by.id !== me.id) {
        const announce = noticeSpeech(n);
        alert({
          title: n.kind ? n.title : `${n.scope === 'all' ? '전체' : n.scope} 공지`, body: n.kind ? n.body || n.title : n.title,
          urgent: n.urgent, tag: `notice-${n.id}`, prefs: p,
          ...(announce ? { tone: 'call' as const, announce } : {}),
        });
        if (n.urgent) setUrgent({ kind: 'notice', notice: n });
      }
      if (relevant || me.role === 'manager') setData(d => d && { ...d, notices: upsert(d.notices, n) });
      return;
    }

    if (e.type === 'handover') {
      const h = e.handover;
      const isNew = !dataRef.current?.handovers.some(x => x.id === h.id);
      setData(d => d && { ...d, handovers: upsert(d.handovers, h) });
      if (isNew && h.dept === me.dept && h.from.id !== me.id) {
        alert({ title: `${h.dept} 인수인계 — ${h.from.name}`, body: h.note || `미처리 ${h.openTasks.length}건`, urgent: false, tag: `handover-${h.id}`, prefs: p });
      }
      return;
    }
    if (e.type === 'patrol') return setData(d => d && { ...d, patrols: upsert(d.patrols, e.patrol) });
    if (e.type === 'report') {
      setData(d => d && { ...d, reports: upsert(d.reports, e.report) });
      if (e.report.auto) alert({ title: '주간 손실방지 리포트', body: '지난주 리포트가 도착했습니다. 보안 > 분석에서 확인하세요.', urgent: false, tag: `report-${e.report.id}`, prefs: p });
      return;
    }
    if (e.type === 'incident') {
      const i = e.incident;
      setData(d => d && { ...d, incidents: upsert(d.incidents, i) });
      if (e.action === 'created') {
        if (i.reportedBy.id === me.id) return;
        // 보안/관리자는 진행 중이면 사이렌, 구역 부서는 일반 알림(주변 고객 응대 요청)
        const handler = canHandleIncident(me);
        const body = `${i.zone}${i.productName ? ` · ${i.productName}` : ''}${handler ? '' : ' — 주변 고객 응대로 확인 부탁드립니다'}`;
        // 보안 담당 호출은 매장에서 들려도 되게 유형·위치를 말하지 않는다
        alert({ title: `보안 ${i.type}`, body, urgent: handler && i.urgent, tag: `incident-${i.id}`, prefs: p, ...(handler ? { tone: 'call' as const, announce: `${i.urgent ? '긴급 호출. ' : ''}보안 담당님 호출입니다.` } : {}) });
        if (handler && i.urgent) setUrgent({ kind: 'incident', incident: i });
      } else {
        const last = i.history[i.history.length - 1];
        if (i.reportedBy.id === me.id && last.by.id !== me.id) {
          alert({ title: `보안 신고 ${last.status}`, body: `${i.zone} — ${last.by.name}`, urgent: false, tag: `incident-${i.id}`, prefs: p });
        }
        setUrgent(u => {
          if (u?.kind === 'incident' && u.incident.id === i.id && i.status !== '접수') { stopAlarm(); return null; }
          return u;
        });
      }
      return;
    }

    const t = e.task;
    setData(d => d && { ...d, tasks: upsert(d.tasks, t) });
    if (e.action === 'created') {
      const forMe = t.toDept === me.dept && t.createdBy.id !== me.id;
      if (forMe || (me.role === 'manager' && t.urgent && t.createdBy.id !== me.id)) {
        alert({ title: `${t.urgent ? '🚨 긴급 · ' : '📣 '}${t.toDept} 담당님 호출입니다`, body: `${t.fromDept} ${t.category}: ${t.title}${t.location ? ` (${t.location})` : ''}`, urgent: t.urgent, tag: `task-${t.id}`, prefs: p, tone: 'call', announce: callPhrase(t.toDept, t.category, t.location, t.urgent) });
        if (t.urgent) setUrgent({ kind: 'task', task: t });
      }
    } else {
      const last = t.history[t.history.length - 1];
      if (t.createdBy.id === me.id && last.by.id !== me.id) {
        alert({ title: `요청 ${last.status}`, body: `${t.title} — ${last.by.dept} ${last.by.name}`, urgent: false, tag: `task-${t.id}`, prefs: p });
      }
      // 누군가 확인하면 긴급 사이렌 해제
      setUrgent(u => {
        if (u?.kind === 'task' && u.task.id === t.id && t.status !== '접수') { stopAlarm(); return null; }
        return u;
      });
    }
  }, []);

  const loggedIn = Boolean(data);
  useEffect(() => {
    if (!loggedIn) return;
    return connectStream(handleEvent, setConnected, load);
  }, [loggedIn, handleEvent, load]);

  // 로그인하면 이 기기를 직원 계정에 푸시 등록 (권한이 이미 있으면 자동)
  useEffect(() => {
    if (!loggedIn) return;
    void (async () => {
      const state = await pushState();
      if (state === 'off' && 'Notification' in window && Notification.permission === 'granted') setPush(await enablePush().catch(() => 'off' as const));
      else setPush(state);
    })();
  }, [loggedIn]);

  const turnOnPush = async () => {
    try {
      const state = await enablePush();
      setPush(state);
      showToast(state === 'on' ? '푸시 알림을 켰습니다.' : PUSH_LABEL[state], state !== 'on');
    } catch (e) {
      // 시크릿 모드, 브라우저 알림 차단, 푸시 서비스 접속 불가 등
      onError('이 기기에서 푸시 등록이 거부되었습니다. 시크릿 모드가 아닌지, 브라우저 알림이 허용되어 있는지 확인해 주세요.');
      console.error('push subscribe failed', e);
    }
  };

  // ---- 오프라인 전송 대기함 ----
  const flushOutbox = useCallback(async () => {
    const r = await flush();
    if (r.sent) showToast(`대기 중이던 ${r.sent}건을 보냈습니다.`);
    if (r.dropped.length) onError(`보내지 못하고 삭제됨: ${r.dropped.join(', ')}`);
  }, [showToast, onError]);

  const pendingRef = useRef(pending);
  useEffect(() => onOutboxChange(items => {
    if (items.length > pendingRef.current) showToast(`연결이 불안정합니다. 연결되면 자동으로 보냅니다 (대기 ${items.length}건)`);
    pendingRef.current = items.length;
    setPending(items.length);
  }), [showToast]);

  useEffect(() => {
    const up = () => { setNetOnline(true); void flushOutbox(); void load(); };
    const down = () => setNetOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, [flushOutbox, load]);

  useEffect(() => {
    if (!loggedIn || !connected) return;
    void flushOutbox();
    if (stale) void load();
  }, [loggedIn, connected, flushOutbox, stale, load]);

  useEffect(() => {
    if (!pending) return;
    const t = window.setInterval(() => void flushOutbox(), 30000);
    return () => clearInterval(t);
  }, [pending, flushOutbox]);

  const updatePrefs = (p: AlertPrefs) => { setPrefs(p); savePrefs(p); };

  const openRequest = (d: Draft) => { setDraft({ ...d }); setTab('request'); };

  const acknowledgeUrgent = async () => {
    stopAlarm();
    const u = urgent;
    setUrgent(null);
    if (!u || !data) return;
    try {
      if (u.kind === 'notice') await send(`/notices/${u.notice.id}/read`, {}, '긴급 공지 확인');
      else if (u.kind === 'incident') {
        if (u.incident.status === '접수') await send(`/incidents/${u.incident.id}/status`, { status: '확인' }, '보안 경보 확인');
        setTab('security');
      }
      else if (u.task.status === '접수' && (u.task.toDept === data.me.dept || data.me.role === 'manager')) await advance(u.task, '확인');
    } catch (e) {
      onError((e as Error).message);
    }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-500">마트ON 연결 중…</div>;
  if (!data) return <div className="min-h-screen bg-slate-100"><Login onLogin={() => { setLoading(true); void load(); }} /></div>;

  const { me, tasks, notices, products, promotions, incidents, patrols, reports, handovers, online, aiEnabled } = data;
  const openIncidents = incidents.filter(i => i.status !== '종결' && (canHandleIncident(me) || i.reportedBy.id === me.id || i.dept === me.dept)).length;
  const openForMe = tasks.filter(t => t.toDept === me.dept && t.status !== '완료').length;
  const unreadNotices = notices.filter(n => (n.scope === 'all' || n.scope === me.dept) && !n.readBy.includes(me.id)).length;

  const tabs: { id: Tab; label: string; icon: typeof ClipboardList; badge?: number }[] = [
    { id: 'tasks', label: '업무', icon: ClipboardList, badge: openForMe },
    { id: 'request', label: '요청', icon: Send },
    { id: 'find', label: '상품찾기', icon: Search },
    { id: 'photo', label: '촬영AI', icon: Camera },
    { id: 'notices', label: '공지', icon: Megaphone, badge: unreadNotices },
    { id: 'security', label: '보안', icon: ShieldAlert, badge: openIncidents },
    ...(me.role === 'manager' ? [{ id: 'manager' as Tab, label: '관리', icon: LayoutDashboard }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-100 pb-24 font-sans text-slate-900" onPointerDown={unlockAudio}>
      <header className="sticky top-0 z-20 bg-blue-700 text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="text-xl font-black tracking-tight">마트<span className="text-yellow-300">ON</span></div>
          <span className={cx('size-2 rounded-full', connected && netOnline ? 'bg-emerald-400' : 'bg-red-400 animate-pulse')} title={connected && netOnline ? '실시간 연결됨' : '연결 끊김'} />
          <div className="ml-auto text-right text-xs leading-tight">
            <div className="font-bold">{me.name} {me.title ?? ''}</div>
            <div className="text-blue-200">{me.dept} · {me.duty}</div>
          </div>
          <button onClick={() => { unlockAudio(); setVoiceOpen(true); }} aria-label="말로 요청하기" className="rounded-full bg-red-500 p-2 active:bg-red-600"><Mic className="size-5" /></button>
          <button onClick={() => setShowSettings(s => !s)} aria-label="설정" className="rounded-lg p-1.5 active:bg-blue-800"><Settings className="size-5" /></button>
        </div>
        {(!connected || pending > 0) && (
          <div className={cx('flex items-center justify-center gap-2 py-1.5 text-xs font-semibold', netOnline ? 'bg-red-500' : 'bg-slate-700')}>
            <span>
              {!netOnline ? '오프라인' : !connected ? '실시간 연결 끊김 · 재연결 중' : '전송 대기'}
              {pending > 0 && ` · 보내지 못한 ${pending}건 (연결되면 자동 전송)`}
              {stale && ' · 저장된 화면 표시 중'}
            </span>
            {pending > 0 && netOnline && <button onClick={() => void flushOutbox()} className="rounded bg-white/20 px-2 py-0.5">다시 시도</button>}
          </div>
        )}
      </header>

      {showSettings && (
        <div className="mx-auto max-w-2xl px-4 pt-3">
          <div className="space-y-3 rounded-2xl bg-white p-4 shadow">
            <div className="flex items-center justify-between font-bold">알림 설정<button onClick={() => setShowSettings(false)}><X className="size-5" /></button></div>
            {([['sound', '알림음'], ['vibrate', '진동'], ['call', '부서 호출 음성 ("○○ 담당님 호출입니다")'], ['voice', '모든 알림 읽어 주기 (베타)']] as const).map(([k, label]) => (
              <label key={k} className="flex items-center justify-between text-sm">
                {label}<input type="checkbox" className="size-5 accent-blue-600" checked={prefs[k]} onChange={e => updatePrefs({ ...prefs, [k]: e.target.checked })} />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
              <button className="rounded-xl bg-slate-100 py-2.5" onClick={() => alert({ title: '테스트 알림', body: '알림이 정상 동작합니다.', urgent: false, tag: 'test', prefs })}>알림음 테스트</button>
              <button className="rounded-xl bg-amber-50 py-2.5 text-amber-800" onClick={() => alert({ title: '호출 테스트', body: '받은 요청은 이 소리와 음성으로 알립니다.', urgent: false, tag: 'test', prefs, tone: 'call', announce: callPhrase(me.dept, '테스트') })}>호출음 테스트</button>
              <button className="rounded-xl bg-red-50 py-2.5 text-red-700" onClick={() => { void startSiren(); setTimeout(stopAlarm, 3000); }}>사이렌 테스트 (3초)</button>
              <button className="rounded-xl bg-slate-100 py-2.5 disabled:opacity-50" disabled={push !== 'on'} onClick={() => api<{ devices: number }>('/push/test', {}).then(r => showToast(`푸시를 보냈습니다 (기기 ${r.devices}대). 앱을 닫고 확인해 보세요.`), e => onError(e.message))}>푸시 테스트</button>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="font-semibold">푸시 알림 <span className={push === 'on' ? 'text-emerald-600' : 'text-slate-500'}>{PUSH_LABEL[push]}</span></div>
              {push === 'off' && <button className="mt-2 w-full rounded-xl bg-blue-600 py-2.5 font-bold text-white" onClick={turnOnPush}>푸시 알림 켜기</button>}
            </div>
            <button className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-white" onClick={() => { setShowSettings(false); setHandoverOpen(true); }}>퇴근 · 로그아웃</button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {!soundOk && prefs.sound && (
          <div className="mb-4 rounded-2xl bg-slate-800 p-3 text-center text-[13px] font-semibold text-white">🔈 긴급 사이렌이 울리려면 화면을 한 번 눌러 주세요</div>
        )}
        {push === 'off' && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-amber-50 p-3 text-[13px] text-amber-900">
            <span className="flex-1">화면이 꺼져 있어도 요청·긴급 경보를 받으려면 푸시 알림을 켜 주세요.</span>
            <button className="shrink-0 rounded-lg bg-amber-500 px-3 py-2 font-bold text-white" onClick={turnOnPush}>켜기</button>
          </div>
        )}
        {push === 'ios-install' && (
          <div className="mb-4 rounded-2xl bg-amber-50 p-3 text-[13px] text-amber-900">아이폰은 Safari 공유 버튼 → <b>홈 화면에 추가</b> 후, 홈 화면의 마트ON에서 열어야 푸시 알림을 받을 수 있습니다.</div>
        )}
        {tab === 'tasks' && <HandoverInbox handovers={handovers} me={me} onError={onError} />}
        {tab === 'tasks' && <TaskBoard tasks={tasks} me={me} onError={onError} />}
        {tab === 'request' && <RequestForm me={me} draft={draft} onError={onError} onVoice={() => setVoiceOpen(true)} onSent={t => { if (t) showToast(`${t.toDept}에 요청을 보냈습니다.`); setTab('tasks'); }} />}
        {tab === 'find' && <ProductFinder products={products} promotions={promotions} onRequest={openRequest} onError={onError} />}
        {tab === 'photo' && <PhotoAI me={me} aiEnabled={aiEnabled} products={data.products} promotions={data.promotions} onRequest={openRequest} onError={onError} onToast={showToast} onSent={t => { if (t) showToast(`${t.toDept}에 사진을 보냈습니다.`); else showToast('연결되면 사진을 자동으로 보냅니다.'); setTab('tasks'); }} />}
        {tab === 'notices' && <Notices notices={notices} me={me} onError={onError} />}
        {tab === 'security' && <Security me={me} incidents={incidents} patrols={patrols} reports={reports} products={products} onError={onError} onToast={showToast} />}
        {tab === 'manager' && me.role === 'manager' && <Manager me={me} tasks={tasks} notices={notices} handovers={handovers} online={online} onError={onError} onToast={showToast} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-2xl">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setTab(id)} className={cx('relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold', tab === id ? 'text-blue-700' : 'text-slate-500')}>
              <Icon className="size-5" />{label}
              {!!badge && <span className="absolute right-[calc(50%-20px)] top-1 min-w-4 rounded-full bg-red-600 px-1 text-[10px] leading-4 text-white">{badge}</span>}
            </button>
          ))}
        </div>
      </nav>

      {toast && (
        <div className={cx('fixed inset-x-4 bottom-20 z-30 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-lg', toast.error ? 'bg-red-600' : 'bg-slate-900')}>
          {toast.msg}
        </div>
      )}

      {handoverOpen && (
        <HandoverSheet
          me={me}
          tasks={tasks}
          incidents={incidents}
          onCancel={() => setHandoverOpen(false)}
          onError={onError}
          onDone={() => { setHandoverOpen(false); void logout(); }}
        />
      )}

      {voiceOpen && (
        <VoiceRequest
          products={products}
          aiEnabled={aiEnabled}
          voice={prefs.voice}
          onClose={() => setVoiceOpen(false)}
          onError={onError}
          onSent={t => { setVoiceOpen(false); if (t) showToast(`${t.toDept}에 요청을 보냈습니다.`); setTab('tasks'); }}
          onEdit={d => { setVoiceOpen(false); openRequest(d); }}
        />
      )}

      {urgent && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-red-600 p-6 text-center text-white">
          <Siren className="size-20 animate-pulse" />
          {!soundOk && prefs.sound && (
            <button onClick={() => void startSiren()} className="rounded-full bg-black/30 px-5 py-2.5 text-sm font-bold text-white ring-2 ring-white/60">
              🔇 소리가 막혀 있습니다 · 눌러서 사이렌 켜기
            </button>
          )}
          {urgent.kind === 'task' ? (
            <div>
              <div className="text-lg font-bold text-red-100">긴급 {urgent.task.category}</div>
              <div className="mt-2 text-3xl font-black">{urgent.task.title}</div>
              <div className="mt-2 text-lg">{urgent.task.fromDept} {urgent.task.createdBy.name}{urgent.task.location ? ` · ${urgent.task.location}` : ''}</div>
              {urgent.task.detail && <p className="mt-3 text-base text-red-50">{urgent.task.detail}</p>}
            </div>
          ) : urgent.kind === 'incident' ? (
            <div>
              <div className="text-lg font-bold text-red-100">보안 {urgent.incident.source === 'sensor' ? `센서 ${urgent.incident.sensorId}` : '신고'} · 진행 중</div>
              <div className="mt-2 text-3xl font-black">{urgent.incident.zone}</div>
              <div className="mt-2 text-lg">{urgent.incident.type}{urgent.incident.productName ? ` · ${urgent.incident.productName}` : ''}</div>
              {urgent.incident.note && <p className="mt-3 text-base text-red-50">{urgent.incident.note}</p>}
              <p className="mt-4 text-sm text-red-100">직접 제지하지 말고 현장 확인 후 관리자에게 보고하세요.</p>
            </div>
          ) : (
            <div>
              <div className="text-lg font-bold text-red-100">긴급 공지</div>
              <div className="mt-2 text-3xl font-black">{urgent.notice.title}</div>
              {urgent.notice.body && <p className="mt-3 text-base text-red-50">{urgent.notice.body}</p>}
            </div>
          )}
          <button onClick={acknowledgeUrgent} className="w-full max-w-sm rounded-2xl bg-white py-5 text-xl font-black text-red-600 active:bg-red-50">확인했습니다</button>
        </div>
      )}
    </div>
  );
}
