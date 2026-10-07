import { useCallback, useEffect, useRef, useState } from 'react';
import { ClipboardList, Send, Search, Camera, Megaphone, LayoutDashboard, Settings, Siren, X } from 'lucide-react';
import type { Bootstrap, Notice, Staff, StreamEvent, Task } from './shared';
import { api, ApiError, bootstrap, connectStream, session } from './api';
import { alert, loadPrefs, registerServiceWorker, requestNotificationPermission, savePrefs, stopAlarm, unlockAudio, type AlertPrefs } from './alerts';
import { cx, type Draft } from './ui';
import Login from './screens/Login';
import TaskBoard, { advance } from './screens/TaskBoard';
import RequestForm from './screens/RequestForm';
import ProductFinder from './screens/ProductFinder';
import PhotoAI from './screens/PhotoAI';
import Notices from './screens/Notices';
import Manager from './screens/Manager';

type Tab = 'tasks' | 'request' | 'find' | 'photo' | 'notices' | 'manager';
type Urgent = { kind: 'task'; task: Task } | { kind: 'notice'; notice: Notice };

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

  const logout = useCallback(() => {
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

  const updatePrefs = (p: AlertPrefs) => { setPrefs(p); savePrefs(p); };

  const openRequest = (d: Draft) => { setDraft({ ...d }); setTab('request'); };

  const acknowledgeUrgent = async () => {
    stopAlarm();
    const u = urgent;
    setUrgent(null);
    if (!u || !data) return;
    try {
      if (u.kind === 'notice') await api(`/notices/${u.notice.id}/read`, {});
      else if (u.task.status === '접수' && (u.task.toDept === data.me.dept || data.me.role === 'manager')) await advance(u.task, '확인');
    } catch (e) {
      onError((e as Error).message);
    }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-500">마트ON 연결 중…</div>;
  if (!data) return <div className="min-h-screen bg-slate-100"><Login onLogin={() => { setLoading(true); void load(); }} /></div>;

  const { me, tasks, notices, products, promotions, online, aiEnabled } = data;
  const openForMe = tasks.filter(t => t.toDept === me.dept && t.status !== '완료').length;
  const unreadNotices = notices.filter(n => (n.scope === 'all' || n.scope === me.dept) && !n.readBy.includes(me.id)).length;

  const tabs: { id: Tab; label: string; icon: typeof ClipboardList; badge?: number }[] = [
    { id: 'tasks', label: '업무', icon: ClipboardList, badge: openForMe },
    { id: 'request', label: '요청', icon: Send },
    { id: 'find', label: '상품찾기', icon: Search },
    { id: 'photo', label: '촬영AI', icon: Camera },
    { id: 'notices', label: '공지', icon: Megaphone, badge: unreadNotices },
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
              <button className="rounded-xl bg-slate-100 py-2.5" onClick={async () => showToast(`알림 권한: ${await requestNotificationPermission()}`)}>알림 권한 요청</button>
              <button className="rounded-xl bg-slate-100 py-2.5" onClick={() => alert({ title: '테스트 알림', body: '알림이 정상 동작합니다.', urgent: false, tag: 'test', prefs })}>테스트 알림</button>
            </div>
            <button className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-white" onClick={logout}>퇴근 · 로그아웃</button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {tab === 'tasks' && <TaskBoard tasks={tasks} me={me} onError={onError} />}
        {tab === 'request' && <RequestForm me={me} draft={draft} onError={onError} onSent={t => { showToast(`${t.toDept}에 요청을 보냈습니다.`); setTab('tasks'); }} />}
        {tab === 'find' && <ProductFinder products={products} promotions={promotions} onRequest={openRequest} onError={onError} />}
        {tab === 'photo' && <PhotoAI aiEnabled={aiEnabled} onRequest={openRequest} onError={onError} onToast={showToast} />}
        {tab === 'notices' && <Notices notices={notices} me={me} onError={onError} />}
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
