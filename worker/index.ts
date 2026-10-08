// Cloudflare Workers 진입점
// - /api/marton/*  → Durable Object(MartOnStore) 하나가 처리: 데이터·실시간 연결·예약 작업을 한곳에서 관리
// - /marton, /marton/ → 설치 앱 정보가 들어간 HTML
// - 그 외 → 빌드된 정적 파일 (마켓모움 화면 포함)
import { DurableObject } from 'cloudflare:workers';
import { GoogleGenAI } from '@google/genai';
import { registerMartOn, initStore } from '../server/marton';
import { setPlatform } from '../server/platform';
import { martonHtml, isMartonPage, assetLinks } from '../server/web';
import { setStoreUtcOffset } from '../src/marton/shared';
import { Router } from './router';
import { workerPlatform, runDueJobs } from './platform-worker';

export interface Env {
  ASSETS: Fetcher;
  MARTON: DurableObjectNamespace<MartOnStore>;
  [key: string]: unknown;
}

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

export class MartOnStore extends DurableObject<Env> {
  private router = new Router();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // 저장된 데이터를 다 불러온 뒤에 요청을 받는다
    ctx.blockConcurrencyWhile(async () => {
      setPlatform(workerPlatform(ctx, env));
      setStoreUtcOffset(Number(str(env.MARTON_UTC_OFFSET_MIN) ?? 540));
      await initStore();
      registerMartOn(this.router, new GoogleGenAI({ apiKey: str(env.GEMINI_API_KEY) ?? '' }));
    });
  }

  async fetch(request: Request) {
    return (await this.router.handle(request)) ?? Response.json({ error: '없는 경로입니다.' }, { status: 404 });
  }

  async alarm() {
    await runDueJobs(this.ctx);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') return Response.json({ status: 'ok' });
    if (url.pathname.startsWith('/api/marton/')) {
      // 매장 하나 = Durable Object 하나
      return env.MARTON.get(env.MARTON.idFromName('store')).fetch(request);
    }

    if (url.pathname === '/.well-known/assetlinks.json') {
      const links = assetLinks(str(env.MARTON_ANDROID_PACKAGE), str(env.MARTON_ANDROID_SHA256));
      return Response.json(links ?? [], { status: links ? 200 : 404 });
    }

    if (url.pathname === '/' && str(env.MARTON_HOME_REDIRECT) === '1') {
      return Response.redirect(new URL('/marton/', url).toString(), 302);
    }

    if (isMartonPage(url.pathname)) {
      const index = await env.ASSETS.fetch(new URL('/', url));
      return new Response(martonHtml(await index.text()), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
      });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
