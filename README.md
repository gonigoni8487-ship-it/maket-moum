# 더예로

1인 미용실 원장님을 위한 고객 맞춤 관리 앱입니다. 고객 카드(시술 이력·염색 레시피·알러지·메모), 예약 관리, 매출/인기 시술 통계, AI 스타일 추천 및 리마인더 메시지 작성 기능을 제공합니다.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key (AI 스타일 추천 / 메시지 작성 기능에 필요합니다)
3. Run the app:
   `npm run dev`

데이터(고객, 예약, 시술 기록 등)는 브라우저의 localStorage에 저장됩니다.
