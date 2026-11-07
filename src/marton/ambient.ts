// 기다리는 동안 나오는 밝은 배경음악 (기기에서 바로 연주: 파일·저작권·요금 없음)
// 장조의 밝은 화음(C-F-G-C, C-G-F-G) 위로 마림바 같은 통통 튀는 멜로디가 경쾌하게 흐른다
// 휴대폰 스피커는 300Hz 아래가 거의 안 나와서 모든 음을 가운데~높은 음역에 둔다
const BPM = 112;
const STEP = 60 / BPM / 2; // 8분음표 길이(초)
const BAR = STEP * 8; // 한 마디 = 8분음표 8개
// 화음 진행 (한 마디에 하나): 밝은 장조 위주
const CHORDS = [
  [60, 64, 67], // C
  [65, 69, 72], // F
  [67, 71, 74], // G
  [60, 64, 67], // C
  [60, 64, 67], // C
  [67, 71, 74], // G
  [65, 69, 72], // F
  [67, 71, 74], // G
];
// 멜로디: 마디마다 8분음표 8칸, 숫자는 화음 음(0·1·2)을 한 옥타브 위로, -1은 쉼표, 3은 그 위 화음 첫 음
const PATTERNS = [
  [0, 1, 2, 3, 2, 1, 2, -1],
  [2, -1, 1, 2, 3, -1, 2, 1],
  [0, 2, 1, 3, -1, 2, 1, 0],
  [3, 2, 1, -1, 0, 1, 2, 3],
];
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** 짧고 밝은 잔향 */
function reverb(ctx: AudioContext) {
  const len = Math.floor(ctx.sampleRate * 1.6);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

/** 음악을 시작하고, 멈추는 함수를 돌려준다 (멈출 때는 2초에 걸쳐 작아진다) */
export function startAmbient(volume = 1): () => void {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return () => {};
  const ctx = new AC();
  void ctx.resume();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5);
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 7000;
  const wet = ctx.createGain();
  wet.gain.value = 0.25;
  tone.connect(master);
  tone.connect(reverb(ctx)).connect(wet).connect(master);
  // 여러 소리가 겹쳐도 깨지지 않게
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.ratio.value = 8;
  master.connect(limiter).connect(ctx.destination);

  // 화음: 마디 첫 박과 다섯째 박에 부드럽게 치는 밝은 코드 (일렉 피아노 느낌)
  const chord = (at: number, notes: number[]) => {
    for (const m of notes) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.12, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.004, at + STEP * 4);
      g.connect(tone);
      for (const [type, detune] of [['triangle', -5], ['sine', 5]] as const) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = hz(m);
        o.detune.value = detune;
        o.connect(g);
        o.start(at);
        o.stop(at + STEP * 4 + 0.05);
      }
    }
  };
  // 멜로디: 마림바처럼 톡 치고 빨리 사라지는 음
  const pluck = (at: number, m: number) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.38, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.002, at + 0.45);
    g.connect(tone);
    for (const [mult, type] of [[1, 'sine'], [4, 'sine'], [2, 'triangle']] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = hz(m) * mult;
      const og = ctx.createGain();
      og.gain.value = mult === 1 ? 1 : mult === 2 ? 0.25 : 0.08;
      o.connect(og).connect(g);
      o.start(at);
      o.stop(at + 0.5);
    }
  };
  // 반짝이는 가벼운 박자 (하이햇 대신 아주 짧고 높은 소리)
  const tick = (at: number, accent: boolean) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(accent ? 0.05 : 0.025, at);
    g.gain.exponentialRampToValueAtTime(0.0005, at + 0.05);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 6000;
    o.connect(g).connect(tone);
    o.start(at);
    o.stop(at + 0.06);
  };

  // 앞으로 몇 마디씩 미리 예약한다
  let nextBar = ctx.currentTime + 0.1, bar = 0;
  const schedule = () => {
    while (nextBar < ctx.currentTime + BAR * 2) {
      const notes = CHORDS[bar % CHORDS.length];
      const pattern = PATTERNS[(bar + Math.floor(Math.random() * 2)) % PATTERNS.length];
      chord(nextBar, notes);
      chord(nextBar + STEP * 4, notes);
      pattern.forEach((p, i) => {
        if (p >= 0) pluck(nextBar + i * STEP, p === 3 ? notes[0] + 24 : notes[p] + 12);
        tick(nextBar + i * STEP, i % 2 === 0);
      });
      nextBar += BAR;
      bar++;
    }
  };
  schedule();
  const timer = window.setInterval(schedule, 500);

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(timer);
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 2);
    window.setTimeout(() => void ctx.close(), 2300);
  };
}
