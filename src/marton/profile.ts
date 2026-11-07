// 인물 사진 → 상반신 프로필 사진: 화면과 서버가 같이 쓰는 선택지
// 사원증: 회사 가이드라인 54×86mm, 300dpi 이상(638×1016픽셀), 허리 위 상반신, 컬러, 과한 보정·합성 불가
// aiRatio는 AI가 만들 수 있는 가장 가까운 비율 → 기기에서 54:86으로 맞춘다
export const PROFILE_USES = [
  { id: 'id', label: '사원증·증명사진', size: '54×86mm', aiRatio: '2:3', ratio: 54 / 86, minW: 638, minH: 1016 },
  { id: 'sns', label: 'SNS·메신저 프로필', size: '정사각형', aiRatio: '1:1', ratio: 1, minW: 640, minH: 640 },
] as const;
export const profileUse = (id: ProfileUse) => PROFILE_USES.find(u => u.id === id)!;
export type ProfileUse = (typeof PROFILE_USES)[number]['id'];
export const isProfileUse = (v: unknown): v is ProfileUse => PROFILE_USES.some(x => x.id === v);

/** 배경: 증명사진은 단색, SNS는 부드러운 배경 */
export const PROFILE_BACKGROUNDS = {
  id: [
    { id: 'white', label: '흰 벽 (1순위)', prompt: 'a clean, plain, evenly lit white wall (like the 1st-priority example: a smartphone photo taken in front of a white wall), pure white to very light off-white, no texture, no objects' },
    { id: 'sky', label: '하늘색', prompt: 'a perfectly plain, evenly lit light sky-blue (#DCEBF7) studio background' },
    { id: 'gray', label: '연회색', prompt: 'a perfectly plain, evenly lit light gray (#E6E6E6) studio background' },
  ],
  sns: [
    { id: 'blur', label: '원래 배경 흐리게', prompt: 'the ORIGINAL background of the photo, kept but softly blurred like a portrait lens (shallow depth of field)' },
    { id: 'soft', label: '파스텔 단색', prompt: 'a soft, clean pastel beige studio backdrop with a gentle gradient' },
    { id: 'outdoor', label: '밝은 야외', prompt: 'a bright, softly blurred natural outdoor background with green trees and daylight bokeh' },
  ],
} as const;
export type ProfileBackground = (typeof PROFILE_BACKGROUNDS)[ProfileUse][number]['id'];
export const isProfileBackground = (use: ProfileUse, v: unknown): v is ProfileBackground => PROFILE_BACKGROUNDS[use].some(x => x.id === v);

/** 옷: 기본은 올린 사진 그대로. 사원증용으로만 정장 셔츠를 고를 수 있다 */
export const PROFILE_OUTFITS = [
  { id: 'keep', label: '입은 옷 그대로' },
  { id: 'suit', label: '단정한 정장·셔츠' },
] as const;
export type ProfileOutfit = (typeof PROFILE_OUTFITS)[number]['id'];
export const isProfileOutfit = (v: unknown): v is ProfileOutfit => PROFILE_OUTFITS.some(x => x.id === v);

/** 잡티 보정: 자연스럽게(기본) — 일시적인 잡티만 지우고 얼굴은 그대로 / 보정 안 함 */
export const PROFILE_RETOUCH = [
  { id: 'natural', label: '잡티 자동 보정' },
  { id: 'none', label: '보정 안 함' },
] as const;
export type ProfileRetouch = (typeof PROFILE_RETOUCH)[number]['id'];
export const isProfileRetouch = (v: unknown): v is ProfileRetouch => PROFILE_RETOUCH.some(x => x.id === v);

export interface ProfilePhotoResult { image: string } // data:image/...;base64
/** 얼굴(머리) 위치: 원본 사진 기준 0~1 비율 */
export interface ProfileFace { found: boolean; top: number; left: number; bottom: number; right: number }
