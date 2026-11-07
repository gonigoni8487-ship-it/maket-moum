// 인물 사진 → 상반신 프로필 사진 (사원증·증명사진 / SNS 프로필)
// AI 프로필: Gemini 이미지 편집으로 얼굴·머리·체형은 그대로 두고 배경·구도·조명만 바꾼다
// 원본 그대로: 얼굴 위치만 AI로 찾고, 자르기는 기기에서 원본 픽셀 그대로 한다 (얼굴이 1픽셀도 바뀌지 않음)
import type { GoogleGenAI } from '@google/genai';
import { storeDayStart } from '../src/marton/shared';
import {
  PROFILE_BACKGROUNDS, isProfileBackground, profileUse, isProfileOutfit, isProfileUse,
  type ProfileFace, type ProfileOutfit, type ProfilePhotoResult, type ProfileUse,
} from '../src/marton/profile';
import { platform } from './platform';
import { AI_MODEL, auth, parseImage, parseJson, type RouteApp } from './marton';
import { candidates, withModels } from './marton-broadcast';

// 사람 얼굴을 가장 잘 지키는 모델부터 (모델이 없거나 못 쓰면 다음 후보). MARTON_IMAGE_MODEL로 바꿀 수 있다
const IMAGE_MODELS = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];
const DAILY_LIMIT = () => Number(platform().env('MARTON_PROFILE_DAILY_LIMIT')) || 50;

function photoPrompt(use: ProfileUse, background: string, outfit: ProfileOutfit) {
  const bg = (PROFILE_BACKGROUNDS[use] as readonly { id: string; prompt: string }[]).find(b => b.id === background)?.prompt ?? PROFILE_BACKGROUNDS[use][0].prompt;
  return [
    use === 'id'
      ? 'Edit this photo into an upper-body (head to waist) employee ID-card profile photo of the SAME person.'
      : 'Edit this photo into an upper-body (head and shoulders to mid-chest) profile portrait of the SAME person.',
    '',
    'IDENTITY LOCK — the most important rule, above everything else:',
    '- This must be the exact same real person, recognisable instantly by family and coworkers. Treat the face as untouchable pixels: reproduce it exactly as in the input photo.',
    '- Keep EXACTLY: face shape and proportions, eyes (shape, size, spacing, eyelids, colour), eyebrows, nose, mouth and lips, teeth, ears, jawline, chin, skin tone, skin texture, moles, freckles, scars, wrinkles, facial hair, glasses, makeup, hairstyle, hair length, hair colour, hairline, parting, age and body build.',
    '- Keep the same facial expression and head angle. Do not make the person smile more or less.',
    '- Do NOT beautify, slim, smooth skin, enlarge eyes, change makeup, whiten teeth, de-age, re-age, or "improve" the face in any way. No AI-face look, no plastic skin.',
    '- Do not change gender presentation, ethnicity, or accessories (earrings, glasses, piercings) that are visible.',
    '- Keep it a natural colour photo: no black-and-white, no filters, no heavy retouching, no artistic colour grading.',
    '',
    'WHAT YOU MAY CHANGE (only these):',
    `- Background: replace it with ${bg}.`,
    use === 'id'
      ? '- Framing: an employee ID-card photo (Korean company badge, 54x86 mm portrait). Centred, facing the camera, upper body from the top of the head down to the waist, the whole head and hair fully inside the frame with a small margin above, both shoulders and arms fully visible, the face clearly visible and not too small (head about a quarter of the image height). Portrait 2:3.'
      : '- Framing: centred head-and-shoulders portrait, eyes at about 40% from the top, a little space above the hair. Square 1:1.',
    '- Lighting: soft, even, flattering studio light on the face with natural shadows; correct white balance and exposure only.',
    outfit === 'suit'
      ? '- Clothing: change ONLY the clothing to a neat dark navy suit jacket with a plain white shirt (no tie), fitted naturally to the same body and neck. Do not alter the neck, shoulders width or body shape.'
      : '- Clothing: keep the clothes exactly as they are (same garment, colour, pattern, collar). Only extend them naturally if the crop needs more of the shoulders.',
    '- If the input crops off part of the shoulders, extend them naturally and consistently with the visible clothing.',
    '',
    'Output: one photorealistic, high-resolution photo that looks like it was taken with a real camera. No text, no watermark, no borders, no extra people.',
  ].join('\n');
}

function imagePart(response: any): { data: string; mimeType: string } | undefined {
  for (const c of response?.candidates ?? []) {
    for (const p of c?.content?.parts ?? []) {
      if (p?.inlineData?.data && String(p.inlineData.mimeType ?? '').startsWith('image/')) return { data: p.inlineData.data, mimeType: p.inlineData.mimeType };
    }
  }
  return undefined;
}

export function registerProfile(app: RouteApp, genAI: GoogleGenAI, aiEnabled: boolean) {
  const api = '/api/marton';
  const noKey = { error: 'AI 키(GEMINI_API_KEY)가 설정되지 않아 프로필 사진을 만들 수 없습니다.' };
  const used = { day: 0, count: 0 };

  // 1) AI 프로필 사진 만들기
  app.post(`${api}/ai/profile/photo`, auth, async (req, res) => {
    if (!aiEnabled) return res.status(503).json(noKey);
    const image = parseImage(req.body.image);
    if (!image) return res.status(400).json({ error: '인물 사진을 올려 주세요.' });
    const use: ProfileUse = isProfileUse(req.body.use) ? req.body.use : 'id';
    const background = isProfileBackground(use, req.body.background) ? req.body.background : PROFILE_BACKGROUNDS[use][0].id;
    const outfit: ProfileOutfit = use === 'id' && isProfileOutfit(req.body.outfit) ? req.body.outfit : 'keep';
    const today = storeDayStart(Date.now());
    if (used.day !== today) Object.assign(used, { day: today, count: 0 });
    if (used.count >= DAILY_LIMIT()) return res.status(429).json({ error: `프로필 사진은 하루 ${DAILY_LIMIT()}장까지 만들 수 있습니다. 내일 다시 만들거나 "원본 그대로 자르기"를 써 주세요.` });
    used.count++;
    try {
      const response = await withModels(candidates('MARTON_IMAGE_MODEL', IMAGE_MODELS), model => genAI.models.generateContent({
        model,
        contents: [{ parts: [{ inlineData: image }, { text: photoPrompt(use, background, outfit) }] }],
        config: {
          responseModalities: ['IMAGE'],
          temperature: 0.2, // 얼굴을 지어내지 않게 낮게
          imageConfig: { aspectRatio: profileUse(use).aiRatio },
        },
      }));
      const part = imagePart(response);
      if (!part) {
        used.count--;
        return res.status(502).json({ error: '프로필 사진을 만들지 못했습니다. 얼굴이 잘 보이는 다른 사진으로 다시 해 주세요.' });
      }
      res.json({ image: `data:${part.mimeType};base64,${part.data}` } satisfies ProfilePhotoResult);
    } catch (e) {
      used.count--;
      console.error('MartON profile photo error:', e);
      res.status(502).json({ error: '프로필 사진을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  });

  // 2) 원본 그대로 자르기용: 얼굴(머리) 위치만 찾아 준다. 자르기는 기기에서 원본 픽셀 그대로
  app.post(`${api}/ai/profile/face`, auth, async (req, res) => {
    if (!aiEnabled) return res.status(503).json(noKey);
    const image = parseImage(req.body.image);
    if (!image) return res.status(400).json({ error: '인물 사진을 올려 주세요.' });
    try {
      const response = await genAI.models.generateContent({
        model: AI_MODEL,
        config: { responseMimeType: 'application/json', temperature: 0 },
        contents: [{ parts: [{ inlineData: image }, { text: 'Find the main person\'s head (from the top of the hair to the bottom of the chin, ear to ear). Reply JSON only: {"found":true,"box_2d":[ymin,xmin,ymax,xmax]} with coordinates normalised to 0-1000. If there is no person, {"found":false}.' }] }],
      });
      const raw = parseJson<{ found?: boolean; box_2d?: number[] }>(response.text);
      const b = raw.box_2d;
      const ok = raw.found !== false && Array.isArray(b) && b.length === 4 && b.every(n => Number.isFinite(n)) && b[2] > b[0] && b[3] > b[1];
      const n = (v: number) => Math.min(1, Math.max(0, v / 1000));
      res.json((ok ? { found: true, top: n(b![0]), left: n(b![1]), bottom: n(b![2]), right: n(b![3]) } : { found: false, top: 0, left: 0, bottom: 0, right: 0 }) satisfies ProfileFace);
    } catch (e) {
      console.error('MartON profile face error:', e);
      res.status(502).json({ error: '얼굴 위치를 찾지 못했습니다. 직접 위치를 맞춰 주세요.' });
    }
  });
}
