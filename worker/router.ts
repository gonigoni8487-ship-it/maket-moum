// Cloudflare용 작은 라우터: server/marton*.ts의 Express 스타일 핸들러를 그대로 실행한다.
// 쓰는 기능만 구현: req.body/params/query/headers/ip/header()/on('close'),
// res.status/set/setHeader/type/json/send/end/redirect/flushHeaders/write/headersSent

type Next = (err?: unknown) => Promise<void>;
type Handler = (req: any, res: any, next: Next) => unknown;
interface Route { method: string; re: RegExp; keys: string[]; handlers: Handler[] }

const MAX_BODY = 8 * 1024 * 1024; // Express json({ limit: '8mb' })와 같게
const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  html: 'text/html; charset=utf-8', json: 'application/json; charset=utf-8',
};
const encoder = new TextEncoder();

export class Router {
  private routes: Route[] = [];

  get(path: string, ...handlers: Handler[]) { this.add('GET', path, handlers); }
  post(path: string, ...handlers: Handler[]) { this.add('POST', path, handlers); }

  private add(method: string, path: string, handlers: Handler[]) {
    const keys: string[] = [];
    const pattern = path.replace(/:([A-Za-z_]+)/g, (_, k: string) => { keys.push(k); return '([^/]+)'; });
    this.routes.push({ method, re: new RegExp(`^${pattern}/?$`), keys, handlers });
  }

  /** 맞는 경로가 없으면 null */
  async handle(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    for (const route of this.routes) {
      if (route.method !== request.method && !(route.method === 'GET' && request.method === 'HEAD')) continue;
      const m = route.re.exec(url.pathname);
      if (!m) continue;
      const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      return this.run(route, request, url, params);
    }
    return null;
  }

  private async run(route: Route, request: Request, url: URL, params: Record<string, string>): Promise<Response> {
    const headers: Record<string, string> = {};
    request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

    let body: unknown = {};
    if (request.method === 'POST' && (headers['content-type'] || '').includes('application/json')) {
      const raw = await request.text();
      if (raw.length > MAX_BODY) return Response.json({ error: '요청이 너무 큽니다.' }, { status: 413 });
      try { body = raw ? JSON.parse(raw) : {}; } catch { return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 }); }
    }

    const closeHandlers: (() => void)[] = [];
    let closed = false;
    const fireClose = () => {
      if (closed) return;
      closed = true;
      closeHandlers.forEach(fn => { try { fn(); } catch { /* 무시 */ } });
    };

    const req = {
      method: request.method,
      path: url.pathname,
      url: url.pathname + url.search,
      headers,
      query: Object.fromEntries(url.searchParams),
      params,
      body,
      ip: headers['cf-connecting-ip'] || '',
      header: (name: string) => headers[name.toLowerCase()],
      on(event: string, fn: () => void) { if (event === 'close') closeHandlers.push(fn); },
    };

    let status = 200;
    const out = new Headers();
    let sent = false;
    let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
    let resolve!: (r: Response) => void;
    const done = new Promise<Response>(r => { resolve = r; });

    const finish = (payload: BodyInit | null) => {
      if (sent) return res;
      sent = true;
      resolve(new Response(request.method === 'HEAD' ? null : payload, { status, headers: out }));
      return res;
    };

    const res: any = {
      get headersSent() { return sent; },
      status(code: number) { status = code; return res; },
      set(a: string | Record<string, string>, b?: string) {
        if (typeof a === 'string') out.set(a, b ?? '');
        else for (const [k, v] of Object.entries(a)) out.set(k, v);
        return res;
      },
      setHeader(k: string, v: string) { out.set(k, v); return res; },
      type(t: string) { out.set('content-type', MIME[t] ?? t); return res; },
      json(o: unknown) { out.set('content-type', MIME.json); return finish(JSON.stringify(o)); },
      send(b: unknown) {
        if (b instanceof Uint8Array) return finish(b);
        if (typeof b === 'string') return finish(b);
        return res.json(b);
      },
      end(b?: string) { return finish(b ?? null); },
      redirect(a: number | string, b?: string) {
        status = typeof a === 'number' ? a : 302;
        out.set('location', typeof a === 'number' ? b! : a);
        return finish(null);
      },
      // 실시간 연결(SSE): 응답을 스트림으로 열어 두고 write로 계속 보낸다
      flushHeaders() {
        if (sent) return;
        const stream = new TransformStream<Uint8Array, Uint8Array>();
        writer = stream.writable.getWriter();
        writer.closed.catch(fireClose);
        sent = true;
        resolve(new Response(stream.readable, { status, headers: out }));
      },
      write(chunk: string) {
        if (!writer) res.flushHeaders();
        if (closed) return false;
        writer!.write(encoder.encode(chunk)).catch(fireClose);
        return true;
      },
    };

    let i = 0;
    const next: Next = async err => {
      if (err) throw err;
      const h = route.handlers[i++];
      if (h) await h(req, res, next);
    };
    try {
      await next();
    } catch (e) {
      console.error('MartON route error:', route.method, url.pathname, e);
      if (!sent) res.status(500).json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
    }
    if (!sent) res.status(500).json({ error: '응답이 없습니다.' });
    return done;
  }
}
