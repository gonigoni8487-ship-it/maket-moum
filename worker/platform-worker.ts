// Cloudflare Durable Object용: SQLite 저장소 + 알람으로 예약 작업
import { runJob, type Job, type Platform } from '../server/platform';

// 한 행 2MB 제한 안쪽으로 나눠 저장 (한글은 글자당 3바이트)
const CHUNK_CHARS = 500_000;

export function workerPlatform(ctx: DurableObjectState, env: Record<string, unknown>): Platform {
  const sql = ctx.storage.sql;
  sql.exec('CREATE TABLE IF NOT EXISTS db_chunks (i INTEGER PRIMARY KEY, data TEXT NOT NULL)');
  sql.exec('CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, data BLOB NOT NULL)');
  sql.exec('CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, job TEXT NOT NULL, key TEXT)');

  const armAlarm = async () => {
    const next = sql.exec<{ at: number | null }>('SELECT MIN(at) AS at FROM jobs').one().at;
    if (next == null) return;
    const current = await ctx.storage.getAlarm();
    if (current == null || next < current) await ctx.storage.setAlarm(next);
  };

  return {
    env: name => (typeof env[name] === 'string' ? (env[name] as string) : undefined),
    production: env.NODE_ENV !== 'development',
    saveDelayMs: 0,
    async loadDb() {
      const rows = sql.exec<{ data: string }>('SELECT data FROM db_chunks ORDER BY i').toArray();
      return rows.length ? rows.map(r => r.data).join('') : null;
    },
    async saveDb(json) {
      ctx.storage.transactionSync(() => {
        sql.exec('DELETE FROM db_chunks');
        for (let i = 0, n = 0; i < json.length; i += CHUNK_CHARS, n++) {
          sql.exec('INSERT INTO db_chunks (i, data) VALUES (?, ?)', n, json.slice(i, i + CHUNK_CHARS));
        }
      });
    },
    photos: {
      async put(id, bytes) {
        sql.exec('INSERT OR REPLACE INTO photos (id, data) VALUES (?, ?)', id, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      },
      async get(id) {
        const row = sql.exec<{ data: ArrayBuffer }>('SELECT data FROM photos WHERE id = ?', id).toArray()[0];
        return row ? new Uint8Array(row.data) : null;
      },
      async remove(id) {
        sql.exec('DELETE FROM photos WHERE id = ?', id);
      },
    },
    async schedule(job) {
      if (job.key) sql.exec('DELETE FROM jobs WHERE key = ?', job.key);
      sql.exec('INSERT INTO jobs (at, job, key) VALUES (?, ?, ?)', job.at, JSON.stringify(job), job.key ?? null);
      await armAlarm();
    },
  };
}

/** Durable Object 알람: 시간이 된 작업을 실행하고 다음 알람을 건다 */
export async function runDueJobs(ctx: DurableObjectState) {
  const sql = ctx.storage.sql;
  const due = sql.exec<{ id: number; job: string }>('SELECT id, job FROM jobs WHERE at <= ? ORDER BY at', Date.now()).toArray();
  for (const row of due) {
    sql.exec('DELETE FROM jobs WHERE id = ?', row.id);
    await runJob(JSON.parse(row.job) as Job);
  }
  const next = sql.exec<{ at: number | null }>('SELECT MIN(at) AS at FROM jobs').one().at;
  if (next != null) await ctx.storage.setAlarm(next);
}
