<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d6b10975-14b0-404f-bb66-12015e3b0c53

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 마트ON v2 (매장 직원용 업무 플랫폼)

> 말하면 연결하고, 찍으면 알려주고, 요청하면 처리되는 매장 AI

`npm run dev` 후 휴대폰/PC에서 `http://<서버주소>:3000/marton/` 접속 → 홈 화면에 추가하면 앱(PWA)처럼 사용합니다.

| 기능 | 내용 |
| --- | --- |
| 직원 로그인 | 사번·이름·근무 부서·담당 업무. 점장/부점장은 관리자 PIN 필요 |
| 업무요청 | 고객센터 → 수산/축산/농산/가공/생활문화/MS. 원터치 템플릿(고객응대, 상품 위치, 가격 오류, 행사상품 확인, 재고) |
| 강력 알림 | 실시간(SSE) 수신 → 알림음·진동·시스템 알림. 긴급은 전체화면 사이렌을 누군가 확인할 때까지 반복. 음성 안내(베타) |
| 처리현황 | 접수 → 확인 → 처리중 → 완료, 단계마다 처리자·시각 기록 |
| 상품 찾기 | 상품명/바코드 검색, 음성 질문 “연어 어디 있어요?” → AI가 위치 답변 |
| 촬영 AI | 행사 전단 → 행사정보 추출·등록, 가격표 → 시스템 가격과 비교·오류 요청, 바코드 → 상품 식별 |
| 점장 화면 | 전체/부서 공지(긴급 포함, 읽음 수), 미처리·긴급 요청, 부서별 접속 인원·평균 확인/완료 시간 |

환경변수

- `GEMINI_API_KEY`: 사진 AI·AI 위치 답변 (없으면 상품찾기는 DB 검색으로 동작, 사진 분석은 비활성)
- `MARTON_MANAGER_PIN`: 점장/부점장 로그인 PIN (개발 모드 기본값 `0000`, 운영 모드에서는 반드시 설정)
- `MARTON_DATA_FILE`: 데이터 저장 파일 (기본 `data/marton-db.json`)

실시간 기능은 Express 서버(`npm run build && npm start`)에서 동작합니다. 정적 호스팅(Cloudflare assets)만으로는 `/api/marton` 이 없어 로그인할 수 없습니다.

### 보안·손실방지 (보안 탭)

사람이 아니라 **상황·위치·시간·상품**을 기록합니다. 인상착의 입력란은 없고, 영상은 CCTV 시스템에만 두고 앱에는 카메라 번호와 시각만 남깁니다.

- **직원 신고**: 유형(의심 상황, 도난 확인, 빈 포장/훼손, 보안태그 제거 흔적, 계산 누락 의심) · 진행 중 여부 · 구역 · 발생 시각 · 상품/수량(단가 자동) · CCTV 참고 · 상황 메모
- **알림 대상 제한**: 진행 중 신고는 보안(MS)·관리자에게 사이렌, 해당 구역 부서에는 "고객 응대로 확인" 일반 알림. 신고 내역은 보안·관리자·신고자만 열람
- **대응 기록**: 접수 → 확인 → 대응중 → 종결(결과: 도난 확인 / 사후 발견 손실 / 상품 회수 / 오인·정상 구매), 처리자·시각 기록
- **센서·CCTV 연동**: `POST /api/marton/integrations/alerts` (헤더 `X-MartON-Key: $MARTON_INTEGRATION_KEY`)
  `{"sensorId":"EAS-1","zone":"출입구/EAS 게이트","message":"EAS 태그 감지","productName":"(선택)","cctvRef":"(선택)"}`
- **손실 분석(점장)**: 구역·시간대·요일·상품별 손실, 오인 비율, 평균 확인 시간, AI 예방 조치 추천(키가 없으면 규칙 기반)
- **대응 수칙**: 직접 제지·추궁 금지, 먼저 다가가 응대, 위험 시 물러서기
- 종결된 신고는 180일 후 자동 삭제
