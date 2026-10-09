import { useEffect, useRef, useState } from 'react';

// 말로 받아쓰기: 점장 지시사항·방송 내용을 말하면 글자로 채운다
const recognizerClass = () => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function useDictation(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;
  const supported = Boolean(typeof window !== 'undefined' && recognizerClass());

  useEffect(() => () => { try { recRef.current?.abort(); } catch { /* 이미 끝남 */ } }, []);

  const start = () => {
    const SR = recognizerClass();
    if (!SR) {
      setProblem('이 브라우저는 음성 입력을 지원하지 않습니다. 키보드의 🎤 마이크로 말하거나 Chrome·삼성 인터넷·Safari로 열어 주세요.');
      return;
    }
    const rec = new SR();
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = true; // 지시사항은 길게 말할 수 있게
    rec.onresult = (e: any) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current(r[0].transcript.trim());
        else live += r[0].transcript;
      }
      setInterim(live);
    };
    rec.onerror = (e: any) => setProblem(e.error === 'not-allowed' || e.error === 'service-not-allowed'
      ? '마이크 사용이 막혀 있습니다. 브라우저 설정에서 마이크를 허용해 주세요.' : e.error === 'no-speech' ? '말소리를 듣지 못했습니다. 다시 눌러 말해 주세요.' : null);
    rec.onend = () => { setListening(false); setInterim(''); };
    recRef.current = rec;
    setProblem(null);
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  };

  const stop = () => { try { recRef.current?.stop(); } catch { /* 이미 끝남 */ } };

  return { supported, listening, interim, problem, start, stop };
}
