// 마트ON 서버가 실행 환경(Node 서버 / Cloudflare Durable Object)에 맡기는 부분
// 업무 로직(server/marton*.ts)은 이 인터페이스만 쓰고, 파일·타이머·환경변수를 직접 다루지 않는다.

export interface Job {
  at: number; // 실행 시각 (ms)
  type: string;
  data?: unknown;
  /** 같은 key의 대기 중인 작업은 새 작업으로 바뀐다 (반복 작업이 겹치지 않게) */
  key?: string;
}

export interface Platform {
  /** 환경변수·비밀값 (호출 시점에 읽는다) */
  env(name: string): string | undefined;
  /** 운영 모드: 관리자 PIN 기본값을 쓰지 않는다 */
  production: boolean;
  loadDb(): Promise<string | null>;
  saveDb(json: string): Promise<void>;
  photos: {
    put(id: string, bytes: Uint8Array): Promise<void>;
    get(id: string): Promise<Uint8Array | null>;
    remove(id: string): Promise<void>;
  };
  /** 서버가 잠들거나 재시작해도 실행되어야 하는 예약 작업 (긴급 재알림, 주간 리포트) */
  schedule(job: Job): Promise<void>;
  /** 저장 묶음 지연 (Node는 파일 쓰기를 모아서, Durable Object는 즉시) */
  saveDelayMs: number;
}

let current: Platform | null = null;

export function setPlatform(p: Platform) {
  current = p;
}

export function platform(): Platform {
  if (!current) throw new Error('platform not initialized');
  return current;
}

const jobHandlers = new Map<string, (data: any) => unknown>();

export function onJob(type: string, handler: (data: any) => unknown) {
  jobHandlers.set(type, handler);
}

/** 예약 시각이 된 작업 실행 (각 플랫폼의 타이머·알람이 호출) */
export async function runJob(job: Job) {
  try {
    await jobHandlers.get(job.type)?.(job.data);
  } catch (e) {
    console.error(`MartON job ${job.type} failed:`, e);
  }
}
