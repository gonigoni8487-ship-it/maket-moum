// 인물 사진 → 상반신 프로필 사진 (사원증·증명사진 / SNS 프로필)
// AI 프로필: Gemini 이미지 편집으로 얼굴·머리·체형은 그대로 두고 배경·구도·조명만 바꾼다
// 원본 그대로: 얼굴 위치만 AI로 찾고, 자르기는 기기에서 원본 픽셀 그대로 한다 (얼굴이 1픽셀도 바뀌지 않음)
import type { GoogleGenAI } from '@google/genai';
import { storeDayStart } from '../src/marton/shared';
import {
  PROFILE_BACKGROUNDS, isProfileBackground, isProfileGender, isProfilePose, isProfileRetouch, profileUse, isProfileOutfit, isProfileUse,
  type ProfileFace, type ProfileGender, type ProfileOutfit, type ProfilePose, type ProfileRetouch, type ProfilePhotoResult, type ProfileUse,
} from '../src/marton/profile';
import { platform } from './platform';
import { AI_MODEL, auth, parseImage, parseJson, type RouteApp } from './marton';
import { candidates } from './marton-broadcast';

// 사람 얼굴을 가장 잘 지키는 모델부터 (모델이 없거나 못 쓰면 다음 후보). MARTON_IMAGE_MODEL로 바꿀 수 있다
const IMAGE_MODELS = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];
const DAILY_LIMIT = () => Number(platform().env('MARTON_PROFILE_DAILY_LIMIT')) || 50;

// 옷차림 (사원증 가이드 1순위 예시처럼 단정하게, 흰 벽과 비슷한 흰색 상의는 피한다)
const OUTFIT_PROMPT: Record<Exclude<ProfileOutfit, 'keep'>, Record<ProfileGender, string>> = {
  suit: {
    male: 'a neat dark navy suit jacket over a plain light-blue or white shirt with an open collar (no tie)',
    female: 'a neat black or navy tailored blazer over a simple ivory or soft-blue blouse',
  },
  casual: {
    male: 'a clean, plain dark navy or charcoal crew-neck knit sweater (smart casual, no logos, no prints)',
    female: 'a clean, plain soft beige or light camel round-neck knit sweater (smart casual, no logos, no prints)',
  },
};

function photoPrompt(use: ProfileUse, background: string, outfit: ProfileOutfit, retouch: ProfileRetouch, gender: ProfileGender, pose: ProfilePose) {
  const bg = (PROFILE_BACKGROUNDS[use] as readonly { id: string; prompt: string }[]).find(b => b.id === background)?.prompt ?? PROFILE_BACKGROUNDS[use][0].prompt;
  return [
    use === 'id'
      ? 'Edit this photo into an upper-body (head to waist) employee ID-card profile photo of the SAME person.'
      : 'Edit this photo into an upper-body (head and shoulders to mid-chest) profile portrait of the SAME person.',
    '',
    'IDENTITY LOCK — the most important rule, above everything else:',
    '- This must be the exact same real person, recognisable instantly by family and coworkers. Treat the face as untouchable pixels: reproduce it exactly as in the input photo.',
    `- Keep EXACTLY: face shape and proportions, eyes (shape, size, spacing, eyelids, colour), eyebrows, nose, mouth and lips, teeth, ears, jawline, chin, ${retouch !== 'none' ? 'natural skin colour, real skin texture (visible fine pores), expression lines' : 'skin tone, skin texture, moles, freckles, scars, wrinkles'}, facial hair, glasses, makeup, hairstyle, hair length, hair colour, hairline, parting, age and body build.`,
    '- NEVER add new moles, dark dots, spots, freckles, marks or blemishes anywhere on the face or neck. Do not darken or enlarge existing small spots.',
    pose === 'front'
      ? '- Keep the same facial expression and head angle. Do not make the person smile more or less.'
      : '- Keep the same facial expression, and keep the face exactly as it is, still facing the camera with both eyes clearly visible. Do not make the person smile more or less.',
    retouch !== 'none'
      ? '- Apart from the studio skin retouch below, do NOT slim the face, enlarge eyes, reshape the nose/jaw/lips, change makeup, whiten teeth unnaturally, de-age or re-age. No AI-face look, no plastic, waxy or airbrushed skin.'
      : '- Do NOT beautify, slim, smooth skin, enlarge eyes, change makeup, whiten teeth, de-age, re-age, or "improve" the face in any way. No AI-face look, no plastic skin.',
    '- Do not change gender presentation, ethnicity, or accessories (earrings, glasses, piercings) that are visible.',
    '- Keep it a natural colour photo: no black-and-white, no beauty-app filters, no artistic colour grading.',
    '',
    'WHAT YOU MAY CHANGE (only these):',
    `- Background: replace it with ${bg}.`,
    use === 'id'
      ? '- Framing: an employee ID-card photo (Korean company badge, 54x86 mm portrait). Centred, facing the camera, upper body from the top of the head down to the waist, the whole head and hair fully inside the frame with a small margin above, both shoulders and arms fully visible, the face clearly visible and not too small (head about a quarter of the image height). Portrait 2:3.'
      : '- Framing: centred head-and-shoulders portrait, eyes at about 40% from the top, a little space above the hair. Square 1:1.',
    pose === 'front'
      ? '- Pose: frontal upper body, shoulders square to the camera, standing straight and relaxed, arms naturally down at the sides (like the 1st-priority guide example).'
      : '- Pose: slightly angled upper body — turn the shoulders and torso about 20-30 degrees to one side while the head and face stay turned toward the camera exactly as in the input; relaxed, natural posture, arms down. Both shoulders stay inside the frame.',
    '- Look: a premium Korean photo-studio profile portrait (high-end 프로필 스튜디오), shot on a full-frame camera with an 85mm portrait lens at about f/5.6 — tack-sharp eyes, the whole upper body in focus, clean natural colours, true-to-life skin colour and correct white balance.',
    '- Lighting: professional studio lighting — a large soft key light from the front-side (about 30-45 degrees) with a gentle fill so shadows stay soft, a subtle hair/rim light that separates the hair and shoulders from the background, clean natural catchlights in both eyes, evenly lit background without hot spots. No harsh shadows, no dramatic or coloured lighting.',
    retouch !== 'none' && '- Skin retouch (high-end studio retoucher, natural — it must NOT look retouched): remove all blemishes — acne, pimples, red or dark spots, small pigmentation spots, scabs, enlarged-pore patches, redness and blotchiness; even out the skin tone; gently reduce dark circles and under-eye bags; remove oily shine and keep a soft natural glow; very lightly soften (do not erase) fine lines. Use a frequency-separation style retouch so real skin texture and fine pores remain visible up close — never blurred, smooth plastic or doll-like skin. Also remove moles, dark dots, freckles and age spots on the face and neck (the skin should be clean and spot-free). NEVER add any mole, dot, freckle, spot or mark that is not clearly in the input photo — if unsure, leave the skin clean. Also tidy stray flyaway hairs, smooth clothing wrinkles slightly and remove lint and dust.',
    outfit === 'keep'
      ? '- Clothing: keep the clothes exactly as they are (same garment, colour, pattern, collar). Only extend them naturally if the crop needs more of the shoulders.'
      : `- Clothing: change ONLY the clothing to ${OUTFIT_PROMPT[outfit][gender]} — ${gender === 'male' ? "men's" : "women's"} wear, fitted naturally to the same body, neck and shoulder width. Do not alter the neck, shoulders width or body shape.`,
    retouch === 'model' && '- MODEL / MAGAZINE LOOK (make the SAME person look their absolute best, like a professional model photoshoot — never a different face): beauty-dish or clamshell key light that sculpts the cheekbones and jawline with soft natural contour shadows, bright catchlights, a clean rim light; a confident model posture — shoulders back and relaxed, chest open, neck long, chin very slightly forward and down for a defined jawline; neatly styled, glossy, voluminous hair with no flyaways (same hairstyle, length and colour); flawless but real skin with a healthy glow (pores still visible up close); crisp, well-fitted, wrinkle-free clothes; refined, slightly richer but natural colour grading. Keep the face shape, features and expression of the input — do not reshape, slim or enlarge anything.',
    '- If the input crops off part of the shoulders, extend them naturally and consistently with the visible clothing.',
    '- If the clothing is white or very close to the background colour, keep a soft natural shadow so the outline of the shoulders stays clear.',
    '',
    'Output: one photorealistic, high-resolution photo that looks like it was taken with a real camera. No text, no watermark, no borders, no extra people.',
  ].filter(Boolean).join('\n');
}

function imagePart(response: any): { data: string; mimeType: string } | undefined {
  for (const c of response?.candidates ?? []) {
    for (const p of c?.content?.parts ?? []) {
      if (p?.inlineData?.data && String(p.inlineData.mimeType ?? '').startsWith('image/')) return { data: p.inlineData.data, mimeType: p.inlineData.mimeType };
    }
  }
  return undefined;
}

/** 이미지가 안 나온 이유 (로그·안내용) */
function noImageReason(response: any): string {
  const block = response?.promptFeedback?.blockReason;
  const finish = response?.candidates?.[0]?.finishReason;
  const said = (response?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text).filter(Boolean).join(' ').slice(0, 200);
  return [block && `blocked:${block}`, finish && `finish:${finish}`, said && `text:${said}`].filter(Boolean).join(' ') || 'no-image';
}

type Failure = 'quota' | 'safety' | 'access' | 'other';
/** Gemini 오류·응답을 사람이 알아들을 안내로 나눈다 */
function classify(reason: string): Failure {
  if (/429|RESOURCE_EXHAUSTED|quota|rate limit|billing|limit: 0|exceeded/i.test(reason)) return 'quota';
  if (/SAFETY|PROHIBITED|blocked:|IMAGE_OTHER|RECITATION|policy/i.test(reason)) return 'safety';
  if (/404|not found|not supported|unsupported|does not exist|permission|PERMISSION_DENIED|403|API key/i.test(reason)) return 'access';
  return 'other';
}
const FAILURE_MESSAGE: Record<Failure, string> = {
  quota: 'Gemini API 키의 이미지 생성 한도가 없거나 다 썼습니다. 이미지 모델은 무료 등급에서 쓸 수 없는 경우가 많아, Google AI Studio(aistudio.google.com) → 결제(Billing)에서 유료 등급을 켜야 합니다. 지금은 "원본 그대로 자르기"로 만들어 드렸습니다.',
  safety: 'AI 안전 정책 때문에 이 사진으로는 AI 프로필을 만들지 못했습니다. 얼굴이 정면으로 잘 보이는 다른 사진으로 다시 해 보세요. 지금은 "원본 그대로 자르기"로 만들어 드렸습니다.',
  access: '이 Gemini API 키로는 이미지 생성 모델을 쓸 수 없습니다(모델 권한 없음). 관리자가 키 권한·결제 설정을 확인해야 합니다. 지금은 "원본 그대로 자르기"로 만들어 드렸습니다.',
  other: 'AI 프로필 사진을 만들지 못했습니다. 잠시 후 "다시 만들기"를 눌러 주세요. 지금은 "원본 그대로 자르기"로 만들어 드렸습니다.',
};

export function registerProfile(app: RouteApp, genAI: GoogleGenAI, aiEnabled: boolean) {
  const api = '/api/marton';
  const noKey = { error: 'AI 키(GEMINI_API_KEY)가 설정되지 않아 프로필 사진을 만들 수 없습니다.' };
  const used = { day: 0, count: 0 };

  // 1) AI 프로필 사진 만들기
  app.post(`${api}/ai/profile/photo`, auth, async (req, res) => {
    if (!aiEnabled) return res.status(503).json(noKey);
    const image = parseImage(req.body.image);
    const face = parseImage(req.body.face); // 얼굴 확대본 (얼굴을 더 정확히 따라 그리게)
    if (!image) return res.status(400).json({ error: '인물 사진을 올려 주세요.' });
    const use: ProfileUse = isProfileUse(req.body.use) ? req.body.use : 'id';
    const background = isProfileBackground(use, req.body.background) ? req.body.background : PROFILE_BACKGROUNDS[use][0].id;
    const outfit: ProfileOutfit = isProfileOutfit(req.body.outfit) ? req.body.outfit : 'keep';
    const gender: ProfileGender = isProfileGender(req.body.gender) ? req.body.gender : 'male';
    const pose: ProfilePose = isProfilePose(req.body.pose) ? req.body.pose : 'front';
    const retouch: ProfileRetouch = isProfileRetouch(req.body.retouch) ? req.body.retouch : 'natural';
    const today = storeDayStart(Date.now());
    if (used.day !== today) Object.assign(used, { day: today, count: 0 });
    if (used.count >= DAILY_LIMIT()) return res.status(429).json({ error: `프로필 사진은 하루 ${DAILY_LIMIT()}장까지 만들 수 있습니다. 내일 다시 만들거나 "원본 그대로 자르기"를 써 주세요.` });
    used.count++;
    // 모델마다 시도한다: 오류(한도·권한 등)든 이미지 없이 끝난 응답이든 다음 모델로
    const reasons: string[] = [];
    for (const model of candidates('MARTON_IMAGE_MODEL', IMAGE_MODELS)) {
      try {
        const response = await genAI.models.generateContent({
          model,
          contents: [{ parts: [
            { inlineData: image },
            ...(face ? [{ text: 'IDENTITY REFERENCE — a full-resolution close-up of the same person\'s face from the photo above. Match this face exactly (every feature, proportion, eye shape, glasses, skin colour):' }, { inlineData: face }] : []),
            { text: photoPrompt(use, background, outfit, retouch, gender, pose) },
          ] }],
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
            temperature: 0.1, // 얼굴을 지어내지 않게 낮게
            imageConfig: { aspectRatio: profileUse(use).aiRatio },
          },
        });
        const part = imagePart(response);
        if (part) return res.json({ image: `data:${part.mimeType};base64,${part.data}` } satisfies ProfilePhotoResult);
        reasons.push(`${model}: ${noImageReason(response)}`);
      } catch (e) {
        reasons.push(`${model}: ${String((e as Error)?.message ?? e).slice(0, 300)}`);
      }
    }
    used.count--;
    console.error('MartON profile photo failed:', reasons.join(' | '));
    // 한도·안전 문제가 하나라도 있으면 그 안내가, 모든 모델이 권한 문제면 권한 안내가 가장 쓸모 있다
    const kinds = reasons.map(classify);
    const kind: Failure = kinds.includes('quota') ? 'quota' : kinds.includes('safety') ? 'safety' : kinds.every(k => k === 'access') ? 'access' : 'other';
    res.status(502).json({ error: FAILURE_MESSAGE[kind], reason: kind, detail: reasons.join(' | ').slice(0, 600) });
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
        contents: [{ parts: [{ inlineData: image }, { text: 'Find the main person. Reply JSON only: {"found":true,"box_2d":[ymin,xmin,ymax,xmax],"face_2d":[ymin,xmin,ymax,xmax],"left_eye":[y,x],"right_eye":[y,x],"mouth":[y,x]} with coordinates normalised to 0-1000. box_2d = the whole head from the top of the hair to the bottom of the chin, ear to ear. face_2d = the inner face only, from the top of the eyebrows to the bottom of the chin and from the outer edge of one cheek to the other (no hair, no ears). left_eye = centre of the pupil of the eye that appears on the LEFT side of the image, right_eye = the one on the RIGHT side of the image, mouth = centre of the mouth. If there is no person, {"found":false}.' }] }],
      });
      const raw = parseJson<{ found?: boolean; box_2d?: number[]; face_2d?: number[]; left_eye?: number[]; right_eye?: number[]; mouth?: number[] }>(response.text);
      const pt = (p?: number[]) => (Array.isArray(p) && p.length === 2 && p.every(v => Number.isFinite(v)) ? { x: Math.min(1, Math.max(0, p[1] / 1000)), y: Math.min(1, Math.max(0, p[0] / 1000)) } : null);
      const [le, re, mo] = [pt(raw.left_eye), pt(raw.right_eye), pt(raw.mouth)];
      const marks = le && re && mo && re.x > le.x ? { left: le, right: re, mouth: mo } : undefined;
      const valid = (b?: number[]): b is number[] => Array.isArray(b) && b.length === 4 && b.every(n => Number.isFinite(n)) && b[2] > b[0] && b[3] > b[1];
      const n = (v: number) => Math.min(1, Math.max(0, v / 1000));
      const box = (b: number[]) => ({ top: n(b[0]), left: n(b[1]), bottom: n(b[2]), right: n(b[3]) });
      const b = raw.box_2d;
      res.json((raw.found !== false && valid(b)
        ? { found: true, ...box(b), ...(valid(raw.face_2d) ? { inner: box(raw.face_2d) } : {}), ...(marks ? { marks } : {}) }
        : { found: false, top: 0, left: 0, bottom: 0, right: 0 }) satisfies ProfileFace);
    } catch (e) {
      console.error('MartON profile face error:', e);
      res.status(502).json({ error: '얼굴 위치를 찾지 못했습니다. 직접 위치를 맞춰 주세요.' });
    }
  });
}
