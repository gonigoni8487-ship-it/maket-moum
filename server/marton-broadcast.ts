// 마트ON 행사 매장 방송: 행사상품 → 안내 멘트(AI 작성) → 음성(Gemini TTS) + 배경음악(Lyria). 합치기는 기기에서 한다.
import type { GoogleGenAI } from '@google/genai';
import {
  BROADCAST_THEMES, THEME_STYLE, VOICE_IDS, MIN_SECONDS, MAX_SECONDS, scriptBudget,
  type BroadcastScript, type BroadcastTheme, type BroadcastMusic, type BroadcastSpeech,
} from '../src/marton/broadcast';
import { storeDayStart, type FlyerItem } from '../src/marton/shared';
import { platform } from './platform';
import { auth, text, parseJson, type RouteApp } from './marton';

const AI_MODEL = 'gemini-3.5-flash';
// 음성·음악 모델은 미리보기 단계라 이름이 바뀌기 쉽다. 환경변수로 바꿀 수 있고, 없는 모델이면 다음 후보로 넘어간다.
const TTS_MODELS = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'];
const MUSIC_MODELS = ['lyria-3.5', 'lyria-3-pro-preview'];
const MAX_SEGMENT_CHARS = 600;
/** 음악 생성은 곡당 요금이 붙으므로 매장 하루 생성 수를 제한한다 */
const MUSIC_DAILY_LIMIT = () => Number(platform().env('MARTON_MUSIC_DAILY_LIMIT')) || 30;

const isTheme = (v: unknown): v is BroadcastTheme => BROADCAST_THEMES.includes(v as BroadcastTheme);
const won = (n?: number) => (n ? `${n.toLocaleString()}원` : '');

const candidates = (envName: string, defaults: string[]) => [...new Set([platform().env(envName), ...defaults].filter((m): m is string => Boolean(m)))];
/** 모델이 없거나(404) 이 키로 못 쓰는 경우만 다음 후보로 */
const modelMissing = (e: unknown) => /not found|404|not supported|unsupported|does not exist|permission/i.test(String((e as Error)?.message ?? e));

async function withModels<T>(models: string[], run: (model: string) => Promise<T>): Promise<T> {
  let last: unknown;
  for (const model of models) {
    try { return await run(model); } catch (e) {
      last = e;
      if (!modelMissing(e)) break;
      console.warn(`MartON broadcast: ${model} 사용 불가, 다음 모델 시도`);
    }
  }
  throw last;
}

/** 응답에서 오디오 조각 찾기 */
function audioPart(response: any): { data: string; mimeType: string } | undefined {
  for (const c of response?.candidates ?? []) {
    for (const p of c?.content?.parts ?? []) {
      if (p?.inlineData?.data && String(p.inlineData.mimeType ?? '').startsWith('audio/')) return { data: p.inlineData.data, mimeType: p.inlineData.mimeType };
    }
  }
  return undefined;
}

const itemLine = (it: FlyerItem) => [
  it.name, it.spec && `(${it.spec})`,
  it.price && `행사가 ${won(it.price)}`, it.originalPrice && `정상가 ${won(it.originalPrice)}`,
  it.condition, it.period && `기간 ${it.period}`,
].filter(Boolean).join(' / ');

function cleanItems(input: unknown): FlyerItem[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 40).flatMap((it: any) => {
    const name = text(it?.name, 60);
    if (!name) return [];
    const n = (v: unknown) => (typeof v === 'number' && v > 0 && v < 1e8 ? Math.round(v) : undefined);
    return [{ name, spec: text(it?.spec, 40) || undefined, price: n(it?.price), originalPrice: n(it?.originalPrice), condition: text(it?.condition, 100) || undefined, period: text(it?.period, 40) || undefined }];
  });
}

export function registerBroadcast(app: RouteApp, genAI: GoogleGenAI, aiEnabled: boolean) {
  const api = '/api/marton';
  const noKey = { error: 'AI 키(GEMINI_API_KEY)가 설정되지 않아 매장 방송을 만들 수 없습니다.' };
  const musicUsed = { day: 0, count: 0 };

  // 1) 행사상품으로 방송 멘트 쓰기
  app.post(`${api}/ai/broadcast/script`, auth, async (req, res) => {
    if (!aiEnabled) return res.status(503).json(noKey);
    const items = cleanItems(req.body.items);
    if (!items.length) return res.status(400).json({ error: '방송할 행사상품을 한 개 이상 골라 주세요.' });
    const seconds = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(Number(req.body.seconds) || 120)));
    const wantTheme = isTheme(req.body.theme) ? req.body.theme : '자동';
    const wantVoice = VOICE_IDS.includes(req.body.voice) ? String(req.body.voice) : undefined;
    const note = text(req.body.note, 100);
    const { segments, chars } = scriptBudget(seconds);
    const themes = Object.keys(THEME_STYLE);

    try {
      const response = await genAI.models.generateContent({
        model: AI_MODEL,
        config: { responseMimeType: 'application/json' },
        contents: [{ parts: [{ text: [
          '당신은 한국 대형마트의 매장 안내 방송 작가입니다. 아래 행사상품으로 매장 스피커에서 나갈 안내 방송 원고를 쓰세요.',
          `- 전체 분량: 공백을 뺀 글자 수로 약 ${chars}자 (±10%). 이 분량이 방송 ${Math.round(seconds / 60 * 10) / 10}분에 맞춰져 있으니 꼭 지키세요.`,
          `- ${segments}개 단락으로 나누세요. 단락 사이에는 배경음악만 잠깐 나옵니다. 첫 단락은 인사와 행사 소개, 마지막 단락은 행사 기간·한 번 더 핵심 상품 강조·마무리 인사.`,
          '- 상품명, 행사가, 할인 조건(1+1, 카드 할인 등)은 전단 그대로 정확히. 없는 가격·혜택을 지어내지 마세요.',
          '- 귀로 듣는 방송입니다: 숫자는 읽기 쉽게 한글로 풀어 쓰기 (14,900원 → 만 사천구백 원, 500g → 오백 그램, 1+1 → 원 플러스 원, L.POINT → 엘포인트). 괄호·기호·이모지 쓰지 않기.',
          '- 존댓말, 짧은 문장. "고객 여러분" 같은 매장 방송 말투. 상품이 적어 분량이 남으면 핵심 상품을 다시 한번 알려 드리는 단락을 넣으세요.',
          wantTheme === '자동'
            ? `- theme: 상품과 기간을 보고 ${themes.join(', ')} 중 가장 어울리는 하나`
            : `- theme: "${wantTheme}" (이 분위기로 쓰기)`,
          '- tone: 성우에게 줄 말투 지시 한 문장 (한국어, 예: "밝고 경쾌하게, 미소 띤 목소리로")',
          '- music: 배경음악 설명 (영어 한 문장, 장르·악기·빠르기·분위기, instrumental only, 가사·보컬 없음)',
          note && `- 원고에 반영할 내용: ${note}`,
          'JSON으로만: {"title":"방송 제목(짧게)","theme":"","tone":"","music":"","segments":[{"text":"단락 원고"}]}',
          '\n[행사상품]',
          ...items.map(itemLine),
        ].filter(Boolean).join('\n') }] }],
      });
      const raw = parseJson<Record<string, any>>(response.text);
      const theme = (themes.includes(raw.theme) ? raw.theme : wantTheme !== '자동' ? wantTheme : '주말특가') as BroadcastScript['theme'];
      const style = THEME_STYLE[theme];
      const list = (Array.isArray(raw.segments) ? raw.segments : [])
        .map((s: any) => text(typeof s === 'string' ? s : s?.text, MAX_SEGMENT_CHARS))
        .filter(Boolean)
        .slice(0, 12)
        .map((t: string) => ({ text: t }));
      if (!list.length) return res.status(502).json({ error: '방송 원고를 만들지 못했습니다. 다시 시도해 주세요.' });
      res.json({
        title: text(raw.title, 40) || `${theme} 안내 방송`,
        theme,
        tone: text(raw.tone, 120) || style.tone,
        voice: wantVoice ?? style.voice,
        music: text(raw.music, 300) || style.music,
        segments: list,
      } satisfies BroadcastScript);
    } catch (e) {
      console.error('MartON broadcast script error:', e);
      res.status(502).json({ error: '방송 원고를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  });

  // 2) 단락 하나를 음성으로 (단락별로 나눠 보내 응답이 커지지 않게)
  app.post(`${api}/ai/broadcast/speech`, auth, async (req, res) => {
    if (!aiEnabled) return res.status(503).json(noKey);
    const said = text(req.body.text, MAX_SEGMENT_CHARS);
    if (!said) return res.status(400).json({ error: '읽을 원고가 비어 있습니다.' });
    const voice = VOICE_IDS.includes(req.body.voice) ? String(req.body.voice) : 'Kore';
    const tone = text(req.body.tone, 120) || '밝고 친절한 매장 안내 방송 말투로';
    try {
      const response = await withModels(candidates('MARTON_TTS_MODEL', TTS_MODELS), model => genAI.models.generateContent({
        model,
        contents: [{ parts: [{ text: `대형마트 매장 안내 방송입니다. ${tone} 또박또박 읽어 주세요:\n${said}` }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { languageCode: 'ko-KR', voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      }));
      const part = audioPart(response);
      if (!part) return res.status(502).json({ error: '음성을 만들지 못했습니다. 다시 시도해 주세요.' });
      const rate = Number(/rate=(\d+)/.exec(part.mimeType)?.[1]) || 24000;
      res.json({ audio: part.data, sampleRate: rate } satisfies BroadcastSpeech);
    } catch (e) {
      console.error('MartON broadcast speech error:', e);
      res.status(502).json({ error: '음성을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  });

  // 3) 행사 분위기 배경음악
  app.post(`${api}/ai/broadcast/music`, auth, async (req, res) => {
    if (!aiEnabled) return res.status(503).json(noKey);
    const style = text(req.body.music, 300);
    if (!style) return res.status(400).json({ error: '배경음악 설명이 비어 있습니다.' });
    const seconds = Math.min(MAX_SECONDS, Math.max(30, Math.round(Number(req.body.seconds) || 120)));
    const today = storeDayStart(Date.now());
    if (musicUsed.day !== today) Object.assign(musicUsed, { day: today, count: 0 });
    if (musicUsed.count >= MUSIC_DAILY_LIMIT()) return res.status(429).json({ error: `배경음악은 하루 ${MUSIC_DAILY_LIMIT()}곡까지 만들 수 있습니다. 내일 다시 만들거나 음성만으로 방송을 만들어 주세요.` });
    musicUsed.count++;
    try {
      const response = await withModels(candidates('MARTON_MUSIC_MODEL', MUSIC_MODELS), model => genAI.models.generateContent({
        model,
        contents: [{ parts: [{ text: `Instrumental background music for in-store supermarket announcements, about ${seconds} seconds long. ${style}. No vocals, no lyrics, no singing. Steady volume and consistent mood throughout so a voice-over can sit on top, with a clean ending.` }] }],
        config: { responseModalities: ['AUDIO', 'TEXT'] },
      }));
      const part = audioPart(response);
      if (!part) { musicUsed.count--; return res.status(502).json({ error: '배경음악을 만들지 못했습니다. 다시 시도해 주세요.' }); }
      res.json({ audio: part.data, mimeType: part.mimeType.split(';')[0] } satisfies BroadcastMusic);
    } catch (e) {
      musicUsed.count--;
      console.error('MartON broadcast music error:', e);
      res.status(502).json({ error: '배경음악을 만들지 못했습니다. 음성만으로 방송을 만들 수 있습니다.' });
    }
  });
}
