// Web Push 발송 (RFC 8291 메시지 암호화 + RFC 8292 VAPID) — WebCrypto와 fetch만 사용
// Node 20+와 Cloudflare Workers에서 똑같이 동작한다. 키 형식은 web-push 라이브러리와 같다
// (공개키: 비압축 P-256 65바이트 base64url, 개인키: d 32바이트 base64url).

export interface PushSubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

const enc = new TextEncoder();
type Bytes = Uint8Array<ArrayBuffer>;

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Bytes {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Bytes> {
  const k = await crypto.subtle.importKey('raw', key as Bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data as Bytes));
}

export async function generateVapidKeys(): Promise<VapidKeys> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey) as ArrayBuffer);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey) as JsonWebKey;
  return { publicKey: b64urlEncode(raw), privateKey: jwk.d! };
}

/** VAPID 인증 헤더 (ES256 JWT, 12시간 유효) */
async function vapidHeader(endpoint: string, subject: string, vapid: VapidKeys) {
  const pub = b64urlDecode(vapid.publicKey);
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: b64urlEncode(pub.slice(1, 33)), y: b64urlEncode(pub.slice(33, 65)), d: vapid.privateKey, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const header = b64urlEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64urlEncode(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const unsigned = `${header}.${claims}`;
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned)));
  return `vapid t=${unsigned}.${b64urlEncode(signature)}, k=${vapid.publicKey}`;
}

/** aes128gcm 암호화 (RFC 8291): 브라우저만 풀 수 있게 구독 키로 암호화한다 */
async function encryptPayload(payload: Uint8Array, p256dh: string, authSecret: string): Promise<Bytes> {
  const uaPublic = b64urlDecode(p256dh);
  const auth = b64urlDecode(authSecret);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey) as ArrayBuffer);
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey } as never, local.privateKey, 256));

  const prkKey = await hmac(auth, ecdhSecret);
  const ikm = await hmac(prkKey, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, concat(payload, new Uint8Array([2]))));

  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

/** 푸시 1건 발송. 푸시 서비스의 HTTP 상태 코드를 돌려준다 (404·410이면 구독 만료) */
export async function sendWebPush(
  sub: PushSubscriptionKeys,
  payload: string,
  opts: { ttl: number; urgency: 'very-low' | 'low' | 'normal' | 'high'; topic?: string },
  vapid: VapidKeys & { subject: string },
): Promise<number> {
  const body = await encryptPayload(enc.encode(payload), sub.keys.p256dh, sub.keys.auth);
  const headers: Record<string, string> = {
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: String(opts.ttl),
    Urgency: opts.urgency,
    Authorization: await vapidHeader(sub.endpoint, vapid.subject, vapid),
  };
  if (opts.topic) headers.Topic = opts.topic;
  const res = await fetch(sub.endpoint, { method: 'POST', headers, body });
  return res.status;
}
