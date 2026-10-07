import { useCallback, useEffect, useRef, useState } from 'react';
import { ClipboardList, Send, Search, Camera, Megaphone, LayoutDashboard, Settings, Siren, X, ShieldAlert, Mic } from 'lucide-react';
import { canHandleIncident, type Bootstrap, type Incident, type Notice, type Staff, type StreamEvent, type Task } from './shared';
import { api, ApiError, bootstrap, connectStream, session } from './api';
import { alert, loadPrefs, registerServiceWorker, savePrefs, stopAlarm, unlockAudio, type AlertPrefs } from './alerts';
import { cx, type Draft } from './ui';
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
    add('link', { rel: 'manifest', href: '/marton/manifest.webmanifest' });
    add('meta', { name: 'theme-color', content: '#1d4ed8' });
    add('link', { rel: 'apple-touch-icon', href: '/marton/icon.svg' });
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
  const [tab, setTab] = useState<Tab>('tasks');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [urgent, setUrgent] = useState<Urgent | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [prefs, setPrefs] = useState<AlertPrefs>(loadPrefs);
  const [showSettings, setShowSettings] = useState(false);
  const [push, setPush] = useState<PushState>('off');
  const [voiceOpen, setVoiceOpen] = useState(false);

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
    await detachPush();
    void api('/logout', {}).catch(() => {});
    session.set(null);
    stopAlarm();
    setData(null);
    setShowSettings(false);
  }, []);

  const load = useCallback(async () => {
    try {
      setData(await bootstrap());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) session.set(null);
      else onError((e as Error).message);
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
        alert({ title: `${n.scope === 'all' ? '전체' : n.scope} 공지`, body: n.title, urgent: n.urgent, tag: `notice-${n.id}`, prefs: p });
        if (n.urgent) setUrgent({ kind: 'notice', notice: n });
      }
      if (relevant || me.role === 'manager') setData(d => d && { ...d, notices: upsert(d.notices, n) });
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
        alert({ title: `보안 ${i.type}`, body, urgent: handler && i.urgent, tag: `incident-${i.id}`, prefs: p });
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
        alert({ title: `${t.fromDept} → ${t.toDept} ${t.category}`, body: `${t.title}${t.location ? ` (${t.location})` : ''}`, urgent: t.urgent, tag: `task-${t.id}`, prefs: p });
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

  const updatePrefs = (p: AlertPrefs) => { setPrefs(p); savePrefs(p); };

  const openRequest = (d: Draft) => { setDraft({ ...d }); setTab('request'); };

  const acknowledgeUrgent = async () => {
    stopAlarm();
    const u = urgent;
    setUrgent(null);
    if (!u || !data) return;
    try {
      if (u.kind === 'notice') await api(`/notices/${u.notice.id}/read`, {});
      else if (u.kind === 'incident') {
        if (u.incident.status === '접수') await api(`/incidents/${u.incident.id}/status`, { status: '확인' });
        setTab('security');
      }
      else if (u.task.status === '접수' && (u.task.toDept === data.me.dept || data.me.role === 'manager')) await advance(u.task, '확인');
    } catch (e) {
      onError((e as Error).message);
    }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-500">마트ON 연결 중…</div>;
  if (!data) return <div className="min-h-screen bg-slate-100"><Login onLogin={() => { setLoading(true); void load(); }} /></div>;

  const { me, tasks, notices, products, promotions, incidents, patrols, reports, online, aiEnabled } = data;
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
          <span className={cx('size-2 rounded-full', connected ? 'bg-emerald-400' : 'bg-red-400 animate-pulse')} title={connected ? '실시간 연결됨' : '연결 끊김'} />
          <div className="ml-auto text-right text-xs leading-tight">
            <div className="font-bold">{me.name} {me.title ?? ''}</div>
            <div className="text-blue-200">{me.dept} · {me.duty}</div>
          </div>
          <button onClick={() => { unlockAudio(); setVoiceOpen(true); }} aria-label="말로 요청하기" className="rounded-full bg-red-500 p-2 active:bg-red-600"><Mic className="size-5" /></button>
          <button onClick={() => setShowSettings(s => !s)} aria-label="설정" className="rounded-lg p-1.5 active:bg-blue-800"><Settings className="size-5" /></button>
        </div>
        {!connected && <div className="bg-red-500 py-1 text-center text-xs font-semibold">실시간 연결이 끊겼습니다. 재연결 중…</div>}
      </header>

      {showSettings && (
        <div className="mx-auto max-w-2xl px-4 pt-3">
          <div className="space-y-3 rounded-2xl bg-white p-4 shadow">
            <div className="flex items-center justify-between font-bold">알림 설정<button onClick={() => setShowSettings(false)}><X className="size-5" /></button></div>
            {([['sound', '알림음'], ['vibrate', '진동'], ['voice', '음성 안내 (베타)']] as const).map(([k, label]) => (
              <label key={k} className="flex items-center justify-between text-sm">
                {label}<input type="checkbox" className="size-5 accent-blue-600" checked={prefs[k]} onChange={e => updatePrefs({ ...prefs, [k]: e.target.checked })} />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
              <button className="rounded-xl bg-slate-100 py-2.5" onClick={() => alert({ title: '테스트 알림', body: '알림이 정상 동작합니다.', urgent: false, tag: 'test', prefs })}>소리·진동 테스트</button>
              <button className="rounded-xl bg-slate-100 py-2.5 disabled:opacity-50" disabled={push !== 'on'} onClick={() => api<{ devices: number }>('/push/test', {}).then(r => showToast(`푸시를 보냈습니다 (기기 ${r.devices}대). 앱을 닫고 확인해 보세요.`), e => onError(e.message))}>푸시 테스트</button>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="font-semibold">푸시 알림 <span className={push === 'on' ? 'text-emerald-600' : 'text-slate-500'}>{PUSH_LABEL[push]}</span></div>
              {push === 'off' && <button className="mt-2 w-full rounded-xl bg-blue-600 py-2.5 font-bold text-white" onClick={turnOnPush}>푸시 알림 켜기</button>}
            </div>
            <button className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-white" onClick={logout}>퇴근 · 로그아웃</button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {push === 'off' && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-amber-50 p-3 text-[13px] text-amber-900">
            <span className="flex-1">화면이 꺼져 있어도 요청·긴급 경보를 받으려면 푸시 알림을 켜 주세요.</span>
            <button className="shrink-0 rounded-lg bg-amber-500 px-3 py-2 font-bold text-white" onClick={turnOnPush}>켜기</button>
          </div>
        )}
        {push === 'ios-install' && (
          <div className="mb-4 rounded-2xl bg-amber-50 p-3 text-[13px] text-amber-900">아이폰은 Safari 공유 버튼 → <b>홈 화면에 추가</b> 후, 홈 화면의 마트ON에서 열어야 푸시 알림을 받을 수 있습니다.</div>
        )}
        {tab === 'tasks' && <TaskBoard tasks={tasks} me={me} onError={onError} />}
        {tab === 'request' && <RequestForm me={me} draft={draft} onError={onError} onVoice={() => setVoiceOpen(true)} onSent={t => { showToast(`${t.toDept}에 요청을 보냈습니다.`); setTab('tasks'); }} />}
        {tab === 'find' && <ProductFinder products={products} promotions={promotions} onRequest={openRequest} onError={onError} />}
        {tab === 'photo' && <PhotoAI aiEnabled={aiEnabled} onRequest={openRequest} onError={onError} onToast={showToast} />}
        {tab === 'notices' && <Notices notices={notices} me={me} onError={onError} />}
        {tab === 'security' && <Security me={me} incidents={incidents} patrols={patrols} reports={reports} products={products} onError={onError} onToast={showToast} />}
        {tab === 'manager' && me.role === 'manager' && <Manager me={me} tasks={tasks} notices={notices} online={online} onError={onError} onToast={showToast} />}
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

      {voiceOpen && (
        <VoiceRequest
          products={products}
          aiEnabled={aiEnabled}
          voice={prefs.voice}
          onClose={() => setVoiceOpen(false)}
          onError={onError}
          onSent={t => { setVoiceOpen(false); showToast(`${t.toDept}에 요청을 보냈습니다.`); setTab('tasks'); }}
          onEdit={d => { setVoiceOpen(false); openRequest(d); }}
        />
      )}

      {urgent && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-red-600 p-6 text-center text-white">
          <Siren className="size-20 animate-pulse" />
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
