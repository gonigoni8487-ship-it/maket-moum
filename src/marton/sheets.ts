// 근무계획표·소비기한 점검표 파일 읽기 (엑셀 xlsx / CSV). 매장마다 양식이 조금씩 달라서 머리글을 찾아 맞춘다.
import { DEPARTMENTS, normalizeShift, type Department, type ShiftEntry } from './shared';

type Cell = string | number | boolean | Date | null | undefined;
export type Rows = Cell[][];

/** CSV 한 덩어리 → 행 목록 (따옴표·쉼표·줄바꿈 처리) */
export function parseCsv(textIn: string): Rows {
  const text = textIn.replace(/^﻿/, '');
  const rows: Rows = [];
  let row: Cell[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',' || ch === '\t') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => String(c ?? '').trim()));
}

/** 파일 → 행 목록. xlsx는 첫 시트, csv는 UTF-8(엑셀 한글 CSV는 EUC-KR도 시도) */
export async function readRows(file: File): Promise<Rows> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser');
    return (await readSheet(file)) as Rows;
  }
  if (ext === 'csv' || ext === 'txt') {
    const buf = await file.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.includes('�')) {
      try { text = new TextDecoder('euc-kr').decode(buf); } catch { /* 그대로 */ }
    }
    return parseCsv(text);
  }
  if (ext === 'xls') throw new Error('예전 엑셀(xls)은 읽을 수 없습니다. 엑셀에서 "다른 이름으로 저장 → Excel 통합 문서(xlsx)" 또는 CSV로 저장해 올려 주세요.');
  throw new Error('엑셀(xlsx)이나 CSV 파일을 올려 주세요.');
}

const str = (c: Cell) => (c instanceof Date ? c.toISOString().slice(0, 10) : String(c ?? '').trim());
const pad = (n: number) => String(n).padStart(2, '0');
const isName = (v: string) => /^[가-힣]{2,5}$/.test(v) && !/^(이름|성명|직원|부서|파트|담당|합계|소계|비고|근무|구분)$/.test(v);

/** 머리글 칸에서 날짜(일) 읽기: 1, "1", "1일", "10/1", Date */
function dayOf(c: Cell, year: number, month: number): number | null {
  if (c instanceof Date) return c.getUTCFullYear() === year && c.getUTCMonth() + 1 === month ? c.getUTCDate() : null;
  const v = str(c);
  let m = /^(\d{1,2})\s*일?(\([월화수목금토일]\))?$/.exec(v);
  if (m) return Number(m[1]);
  m = /^(\d{1,2})[./-](\d{1,2})/.exec(v);
  if (m && Number(m[1]) === month) return Number(m[2]);
  return null;
}

/**
 * 근무계획표 → 근무 목록.
 * ① 가로형: 한 행에 직원 1명, 머리글 행에 1~31일 (칸에 1/2/3, 1근, 휴 등)
 * ② 세로형: 머리글에 날짜·이름·근무 (한 행에 하루 1명)
 */
export function parseSchedule(rows: Rows, month: string): ShiftEntry[] {
  const [year, mon] = month.split('-').map(Number);
  const days = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const out: ShiftEntry[] = [];

  // ② 세로형
  const headIdx = rows.findIndex(r => r.some(c => /날짜|일자/.test(str(c))) && r.some(c => /이름|성명/.test(str(c))));
  if (headIdx >= 0) {
    const head = rows[headIdx].map(str);
    const ci = (re: RegExp) => head.findIndex(h => re.test(h));
    const [dCol, nCol, sCol, pCol] = [ci(/날짜|일자/), ci(/이름|성명/), ci(/근무|근무조|조|구분/), ci(/부서|파트/)];
    if (sCol >= 0) {
      for (const r of rows.slice(headIdx + 1)) {
        const date = parseDate(r[dCol], year);
        const name = str(r[nCol]);
        const shift = normalizeShift(r[sCol]);
        if (!date?.startsWith(month) || !name || !shift) continue;
        const dept = str(r[pCol]) as Department;
        out.push({ date, name, shift, ...(DEPARTMENTS.includes(dept) ? { dept } : {}) });
      }
      return out;
    }
  }

  // ① 가로형: 날짜 칸이 가장 많은 행을 머리글로
  let best = -1, bestCount = 0;
  rows.forEach((r, i) => {
    const n = r.filter(c => { const d = dayOf(c, year, mon); return d !== null && d >= 1 && d <= days; }).length;
    if (n > bestCount) { best = i; bestCount = n; }
  });
  if (best < 0 || bestCount < 7) return out;
  const head = rows[best];
  const dayCols = new Map<number, number>();
  head.forEach((c, i) => { const d = dayOf(c, year, mon); if (d && d <= days && !dayCols.has(i)) dayCols.set(i, d); });
  const body = rows.slice(best + 1);
  // 이름 칸: 날짜 칸이 아니면서 사람 이름이 가장 많은 열
  let nameCol = -1, nameHits = 0;
  for (let i = 0; i < head.length + 3; i++) {
    if (dayCols.has(i)) continue;
    const hits = body.filter(r => isName(str(r[i]))).length;
    if (hits > nameHits) { nameCol = i; nameHits = hits; }
  }
  if (nameCol < 0) return out;
  const deptCol = [...Array(head.length).keys()].find(i => !dayCols.has(i) && body.some(r => DEPARTMENTS.includes(str(r[i]) as Department)));
  for (const r of body) {
    const name = str(r[nameCol]);
    if (!isName(name)) continue;
    const dept = deptCol !== undefined ? (str(r[deptCol]) as Department) : undefined;
    for (const [col, d] of dayCols) {
      const shift = normalizeShift(r[col]);
      if (!shift) continue;
      out.push({ date: `${month}-${pad(d)}`, name, shift, ...(dept && DEPARTMENTS.includes(dept) ? { dept } : {}) });
    }
  }
  return out;
}

/** 날짜 칸 → YYYY-MM-DD ("2026-10-15", "10/15", "10월 15일", 엑셀 날짜) */
export function parseDate(c: Cell, year: number): string | null {
  if (c instanceof Date) return c.toISOString().slice(0, 10);
  if (typeof c === 'number' && c > 30000 && c < 80000) return new Date(Date.UTC(1899, 11, 30) + c * 86400000).toISOString().slice(0, 10);
  const v = str(c);
  let m = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/.exec(v);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = /^(\d{1,2})\s*[./월-]\s*(\d{1,2})/.exec(v);
  if (m) return `${year}-${pad(+m[1])}-${pad(+m[2])}`;
  return null;
}

/** 시간 칸 → "HH:MM" ("15:00", "15시", "오후 3시", 엑셀 시간 0.625) */
export function parseTime(c: Cell): string | null {
  if (c instanceof Date) return `${pad(c.getUTCHours())}:${pad(c.getUTCMinutes())}`;
  if (typeof c === 'number' && c >= 0 && c < 1) { const m = Math.round(c * 1440); return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; }
  const v = str(c);
  let m = /(\d{1,2})\s*[:시]\s*(\d{1,2})?/.exec(v);
  if (!m) return null;
  let h = Number(m[1]);
  if (/오후|PM/i.test(v) && h < 12) h += 12;
  return `${pad(h)}:${pad(Number(m[2] ?? 0))}`;
}

export interface ExpiryDraft { date: string; time: string; dept: Department; area: string; assignee?: string; note?: string }

/** 소비기한 점검표 → 일정 목록 (머리글: 날짜, 시간, 파트/부서, 구역/품목, 담당자, 비고) */
export function parseExpiry(rows: Rows, year: number): ExpiryDraft[] {
  const headIdx = rows.findIndex(r => r.some(c => /날짜|일자/.test(str(c))) && r.some(c => /파트|부서/.test(str(c))));
  if (headIdx < 0) return [];
  const head = rows[headIdx].map(str);
  const ci = (re: RegExp) => head.findIndex(h => re.test(h));
  const [dCol, tCol, pCol, aCol, wCol, nCol] = [ci(/날짜|일자/), ci(/시간|시각/), ci(/파트|부서/), ci(/구역|품목|장소|대상|내용/), ci(/담당/), ci(/비고|메모/)];
  const out: ExpiryDraft[] = [];
  for (const r of rows.slice(headIdx + 1)) {
    const date = parseDate(r[dCol], year);
    const time = tCol >= 0 ? parseTime(r[tCol]) : '10:00';
    const dept = str(r[pCol]).replace(/파트$/, '') as Department;
    const area = str(r[aCol]);
    if (!date || !time || !DEPARTMENTS.includes(dept) || !area) continue;
    out.push({ date, time, dept, area, assignee: wCol >= 0 ? str(r[wCol]) || undefined : undefined, note: nCol >= 0 ? str(r[nCol]) || undefined : undefined });
  }
  return out;
}

/** 매장 시각(한국) 날짜·시간 → UTC 밀리초 */
export const storeMillis = (date: string, time: string) => Date.parse(`${date}T${time}:00+09:00`);

/** 양식 내려받기 (엑셀에서 열리는 CSV, 한글 깨짐 방지 BOM) */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = '﻿' + rows.map(r => r.map(c => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** 근무계획 양식: 이름·부서 + 1~말일 */
export function scheduleTemplate(month: string): (string | number)[][] {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const head = ['이름', '부서', ...Array.from({ length: days }, (_, i) => `${i + 1}일`)];
  const sample = (name: string, dept: string, seq: string[]) => [name, dept, ...Array.from({ length: days }, (_, i) => seq[i % seq.length])];
  return [head, sample('홍길동', '수산', ['1', '1', '2', '2', '3', '휴', '1']), sample('김영희', '축산', ['2', '3', '휴', '1', '1', '2', '3'])];
}

export const expiryTemplate = (): string[][] => [
  ['날짜', '시간', '파트', '구역/품목', '담당자', '비고'],
  ['2026-10-15', '10:00', '가공', '유제품 냉장 쇼케이스', '홍길동', '우유·요거트'],
  ['2026-10-15', '15:00', '수산', '선어 매대', '김영희', ''],
];
