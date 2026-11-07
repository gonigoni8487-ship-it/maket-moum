// 기다리는 동안 나오는 뉴에이지 배경음악 (기기에서 바로 연주: 파일·저작권·요금 없음)
// 부드러운 패드 화음이 천천히 바뀌고, 그 위로 맑은 벨 소리가 가끔 울린다
const CHORDS = [
  [48, 55, 59, 64, 67], // Cmaj7
  [45, 52, 57, 60, 64], // Am(add9)
  [41, 48, 52, 57, 60], // Fmaj7
  [43, 50, 55, 59, 62], // G
];
const BELL_NOTES = [72, 74, 76, 79, 81, 84, 86, 88]; // C 펜타토닉
const CHORD_S = 6; // 화음 하나 길이(초)
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** 짧은 잔향 (하얀 소음이 천천히 사라지는 응답) */
function reverb(ctx: AudioContext) {
  const len = ctx.sampleRate * 3.5;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.5;
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

/** 음악을 시작하고, 멈추는 함수를 돌려준다 (멈출 때는 2초에 걸쳐 작아진다) */
export function startAmbient(volume = 0.22): () => void {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return () => {};
  const ctx = new AC();
  void ctx.resume();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3);
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2200;
  const wet = ctx.createGain();
  wet.gain.value = 0.55;
  const rev = reverb(ctx);
  tone.connect(master);
  tone.connect(rev).connect(wet).connect(master);
  master.connect(ctx.destination);

  // 패드: 음마다 살짝 어긋난 두 오실레이터를 천천히 부풀렸다 줄인다
  const pad = (at: number, notes: number[]) => {
    for (const m of notes) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.06, at + 2);
      g.gain.setValueAtTime(0.06, at + CHORD_S - 1);
      g.gain.linearRampToValueAtTime(0, at + CHORD_S + 1.5);
      g.connect(tone);
      for (const [type, detune] of [['sine', -6], ['triangle', 6]] as const) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = hz(m);
        o.detune.value = detune;
        o.connect(g);
        o.start(at);
        o.stop(at + CHORD_S + 1.6);
      }
    }
  };
  // 벨: 맑게 울리고 천천히 사라지는 한 음
  const bell = (at: number) => {
    const m = BELL_NOTES[Math.floor(Math.random() * BELL_NOTES.length)];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.05, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0005, at + 3.5);
    g.connect(tone);
    for (const mult of [1, 2.01]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz(m) * mult;
      o.connect(g);
      o.start(at);
      o.stop(at + 3.6);
    }
  };

  // 앞으로 몇 초 분량씩 미리 예약한다
  let nextChord = ctx.currentTime + 0.1, chordIdx = 0, nextBell = ctx.currentTime + 2;
  const schedule = () => {
    while (nextChord < ctx.currentTime + CHORD_S * 2) {
      pad(nextChord, CHORDS[chordIdx++ % CHORDS.length]);
      nextChord += CHORD_S;
    }
    while (nextBell < ctx.currentTime + 4) {
      bell(nextBell);
      nextBell += 1.2 + Math.random() * 2.3;
    }
  };
  schedule();
  const timer = window.setInterval(schedule, 1000);

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
