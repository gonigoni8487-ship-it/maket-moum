// Node(Express) 서버용: 데이터 파일 + 사진 폴더 + 프로세스 타이머
import fs from 'fs';
import path from 'path';
import { runJob, type Platform } from './platform';

export function nodePlatform(): Platform {
  const dataFile = process.env.MARTON_DATA_FILE || path.join(process.cwd(), 'data', 'marton-db.json');
  const photoDir = path.join(path.dirname(dataFile), 'photos'); // 데이터 파일과 같은 디스크
  const keyed = new Map<string, NodeJS.Timeout>();
  return {
    env: name => process.env[name],
    production: process.env.NODE_ENV === 'production',
    saveDelayMs: 300,
    async loadDb() {
      try { return fs.readFileSync(dataFile, 'utf8'); } catch { return null; }
    },
    async saveDb(json) {
      fs.mkdirSync(path.dirname(dataFile), { recursive: true });
      fs.writeFileSync(dataFile, json);
    },
    photos: {
      async put(id, bytes) {
        fs.mkdirSync(photoDir, { recursive: true });
        fs.writeFileSync(path.join(photoDir, id), bytes);
      },
      async get(id) {
        try { return fs.readFileSync(path.join(photoDir, id)); } catch { return null; }
      },
      async remove(id) {
        fs.rmSync(path.join(photoDir, id), { force: true });
      },
    },
    // 재시작하면 대기 중인 작업은 사라진다 (주간 리포트는 시작 시 다시 예약됨)
    async schedule(job) {
      if (job.key) clearTimeout(keyed.get(job.key));
      const timer = setTimeout(() => {
        if (job.key) keyed.delete(job.key);
        void runJob(job);
      }, Math.max(0, job.at - Date.now()));
      timer.unref();
      if (job.key) keyed.set(job.key, timer);
    },
  };
}
