// 음성 안내용 숫자 읽기: 화면 글자는 그대로 두고, 읽어 줄 문장만 한글 발음으로 바꾼다.
// 예) "고등어 1마리 4,990원" → "고등어 한 마리 사천구백구십원", "30% 할인" → "삼십 퍼센트 할인"

const DIGIT = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

/** 한자어 수: 12990 → 만이천구백구십 (1십·1백·1천·1만은 "일"을 붙이지 않음) */
export function sinoKorean(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  if (n === 0) return '영';
  const under10k = (x: number) => {
    let out = '';
    [[1000, '천'], [100, '백'], [10, '십'], [1, '']].forEach(([unit, name]) => {
      const d = Math.floor(x / (unit as number)) % 10;
      if (d) out += (d === 1 && name ? '' : DIGIT[d]) + name;
    });
    return out;
  };
  let out = '';
  const groups: [number, string][] = [[1e12, '조'], [1e8, '억'], [1e4, '만'], [1, '']];
  let rest = Math.floor(n);
  for (const [unit, name] of groups) {
    const g = Math.floor(rest / unit);
    rest %= unit;
    if (!g) continue;
    out += (g === 1 && name === '만' && !out ? '' : under10k(g)) + name;
  }
  return out;
}

/** 소수: 1.5 → 일 점 오 */
function sinoDecimal(raw: string) {
  const [int, frac] = raw.split('.');
  const head = sinoKorean(Number(int));
  return frac ? `${head} 점 ${[...frac].map(d => DIGIT[+d]).join(' ')}` : head;
}

const NATIVE_ONES = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];
const NATIVE_TENS = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];

/** 고유어 수 (단위 앞): 1 → 한, 2 → 두, 20 → 스무, 25 → 스물다섯. 100 이상은 한자어 */
export function nativeKorean(n: number): string {
  if (n <= 0 || n >= 100 || !Number.isInteger(n)) return sinoKorean(n);
  if (n === 20) return '스무';
  return NATIVE_TENS[Math.floor(n / 10)] + NATIVE_ONES[n % 10];
}

// 고유어로 세는 단위 (한 마리, 두 봉, 다섯 입…)
const NATIVE_COUNTERS = ['마리', '개', '팩', '봉지', '봉', '병', '캔', '박스', '상자', '송이', '단', '통', '묶음', '장', '입', '줄', '포기', '망', '알', '판', '켤레', '벌', '번째', '시'];
// 한자어로 읽고 단위 이름을 바꿔 읽는 것
const UNIT_NAMES: Record<string, string> = {
  kg: '킬로그램', g: '그램', mg: '밀리그램', ml: '밀리리터', mL: '밀리리터', L: '리터', l: '리터',
  cm: '센티미터', mm: '밀리미터', m: '미터', '%': ' 퍼센트',
};
const UNIT_RE = Object.keys(UNIT_NAMES).sort((a, b) => b.length - a.length).map(u => u.replace('%', '%')).join('|');
const COUNTER_RE = NATIVE_COUNTERS.sort((a, b) => b.length - a.length).join('|');
const MONTH: Record<number, string> = { 6: '유', 10: '시' };
// 한자어로 읽고 띄어 읽는 단위 (2종 → 이 종, 10구 → 십 구, 30롤 → 삼십 롤)
const SINO_SPACED = ['인분', '종', '롤', '구', '인', '매', '회', '년', '세'];

const NUMBER = /(\d[\d,]*(?:\.\d+)?)\s*/;

/** 문장 속 숫자를 한글 발음으로 */
export function speakNumbers(text: string): string {
  // "5천원", "1만원"처럼 숫자+천/만으로 쓴 금액: 5천 → 오천, 1천 → 천
  text = text.replace(/(\d+)\s*(천|만)(?=\s*원|\s*$|\s)/g, (_, d: string, u: string) => sinoKorean(Number(d) * (u === '천' ? 1000 : 10000)));
  text = text.replace(/\s*[×xX*]\s*(?=\d)/g, ' ');
  // 범위: "4~6입" → 네에서 여섯 입, "69,000~99,000원" → 육만구천에서 구만구천원
  text = text.replace(new RegExp(`(\\d+)\\s*~\\s*(\\d+)\\s*(${COUNTER_RE})`, 'g'), (_, a: string, b: string, c: string) => `${nativeKorean(+a)}에서 ${nativeKorean(+b)} ${c}`);
  text = text.replace(/(\d)\s*~\s*(?=\d)/g, '$1에서 ');
  text = text.replace(new RegExp(`(\\d+)\\s*(${SINO_SPACED.join('|')})(?![가-힣])`, 'g'), (_, d: string, u: string) => `${sinoKorean(+d)} ${u}`);
  const re = new RegExp(`${NUMBER.source}(?:(${COUNTER_RE})|(${UNIT_RE})(?![A-Za-z])|(월))?`, 'g');
  return text.replace(re, (whole, raw: string, counter?: string, unit?: string, month?: string) => {
    const clean = raw.replace(/,/g, '');
    const n = Number(clean);
    const space = /\s$/.test(whole) && !counter && !unit && !month ? ' ' : '';
    if (counter) {
      if (counter === '번째') return `${n === 1 ? '첫' : nativeKorean(n)} 번째`;
      if (counter === '시') return `${nativeKorean(n)} 시`;
      return Number.isInteger(n) && n < 100 ? `${nativeKorean(n)} ${counter}` : `${sinoDecimal(clean)} ${counter}`;
    }
    if (unit) return `${sinoDecimal(clean)}${unit === '%' ? '' : ' '}${UNIT_NAMES[unit]}`;
    if (month) return `${MONTH[n] ?? sinoKorean(n)}월`;
    return sinoDecimal(clean) + space;
  });
}
