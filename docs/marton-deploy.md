# 마트ON 앱 배포 가이드

마트ON은 **설치형 웹앱(PWA)** 입니다. 서버를 한 번 올리면 직원들은 앱스토어 없이 QR → "앱 설치"로 바로 쓸 수 있고, 원하면 같은 주소를 플레이스토어 앱(APK/AAB)으로 포장할 수 있습니다.

```
① 서버 배포 (HTTPS 주소 생성)  →  ② 직원 휴대폰 설치 (QR)  →  ③ (선택) 플레이스토어·앱스토어 포장
```

> Cloudflare Workers 설정(`wrangler.toml`)은 화면 파일만 올리는 방식이라 마트ON의 로그인·실시간 알림·저장이 동작하지 않습니다. 아래 방법으로 서버째 배포하세요.

---

## ① 서버 배포

### 방법 A. Render 원클릭 (추천, 약 10분)

1. 이 브랜치를 `main`에 병합합니다.
2. [render.com](https://render.com) 가입 → GitHub 연결 → **New → Blueprint** → 이 저장소 선택
   (또는 브라우저에서 `https://render.com/deploy?repo=https://github.com/gonigoni8487-ship-it/maket-moum` 열기)
3. `render.yaml`이 자동으로 읽혀 Docker 서비스 + 1GB 영구 디스크(`/data`)가 만들어집니다.
4. 입력을 요구하는 값을 채웁니다.

   | 값 | 예시 | 설명 |
   | --- | --- | --- |
   | `MARTON_MANAGER_PIN` | 6자리 이상 숫자 | 점장/부점장 로그인 PIN |
   | `MARTON_STORE_CODE` | `lotte-jamsil-24` | 매장 공용 접속 코드 (조회실에만 게시) |
   | `MARTON_VAPID_SUBJECT` | `mailto:담당자@회사메일` | 푸시 알림 발신자 표시 |
   | `GEMINI_API_KEY` | (선택) | 사진 AI·AI 답변 |

5. 배포가 끝나면 `https://marton-xxxx.onrender.com` 주소가 생깁니다. 이 주소로 접속하면 바로 마트ON이 열립니다.
6. (선택) Render → Settings → Custom Domain에서 `marton.회사도메인` 연결.

> 영구 디스크는 Render 유료 플랜(Starter)부터 지원됩니다. 무료 플랜은 재시작 때 데이터가 지워지므로 시연용으로만 쓰세요.

### 방법 B. 사내 서버·다른 클라우드 (Docker)

```bash
docker build -t marton .
docker run -d --name marton --restart unless-stopped \
  -p 8080:8080 \
  -v marton-data:/data \
  -e MARTON_MANAGER_PIN=246810 \
  -e MARTON_STORE_CODE=매장코드 \
  -e MARTON_VAPID_SUBJECT=mailto:담당자@회사 \
  marton
```

- 앞단에 HTTPS(사내 리버스 프록시, Nginx + 인증서 등)를 반드시 붙입니다. 푸시·카메라·마이크·앱 설치는 HTTPS에서만 동작합니다.
- `/data` 볼륨에 모든 데이터가 저장됩니다. **매일 백업**하세요 (`/data/marton-db.json` 한 파일).
- Railway, Fly.io 등 Dockerfile을 지원하는 곳은 같은 방식으로 올리면 됩니다. Cloud Run처럼 디스크가 없는 곳은 데이터가 유지되지 않습니다.

### 배포 확인 체크리스트

- [ ] `https://주소/api/health` → `{"status":"ok"}`
- [ ] `https://주소/` → `/marton/`으로 이동, 로그인 화면에 "매장 접속 코드" 입력란 표시
- [ ] 점장 로그인 → 관리 탭 → **직원 초대 QR** 표시
- [ ] 휴대폰에서 푸시 켜기 → 설정 → **푸시 테스트** 수신
- [ ] 보안 > 분석 > **테스트 센서 경보** → 보안 담당 휴대폰 사이렌

---

## ② 직원 휴대폰 설치

점장 화면 **관리 → 직원 초대 QR → 안내문 인쇄**로 조회실에 붙입니다.

| 기기 | 설치 방법 |
| --- | --- |
| 안드로이드 (Chrome·삼성 인터넷) | QR 접속 → 메뉴 ⋮ → **앱 설치** (또는 "홈 화면에 추가") |
| 아이폰 (iOS 16.4+) | QR을 **Safari**로 열기 → 공유 버튼 → **홈 화면에 추가** → 홈 화면 아이콘으로 실행 |

설치 후: 로그인 → **푸시 알림 켜기** → 허용. 안드로이드는 홈 화면 아이콘을 길게 누르면 **말로 요청하기**, **보안 신고** 바로가기가 있습니다.

업데이트는 서버에 새 버전을 배포하면 끝입니다. 직원 앱은 다음에 열 때 자동으로 새 화면을 받습니다(재설치 불필요).

---

## ③ (선택) 플레이스토어 / APK

마트ON은 플레이스토어 포장 요건(PNG 아이콘·maskable 아이콘·스크린샷·바로가기·서비스워커)을 갖추고 있습니다.

1. [pwabuilder.com](https://www.pwabuilder.com) 에서 배포 주소(`https://주소/marton/`) 입력 → **Package for stores → Android**
2. 패키지 ID 입력(예: `com.회사.marton`) → 다운로드하면 `.aab`(플레이스토어용), `.apk`(직접 설치용), `signing.keystore`, `assetlinks.json`이 나옵니다.
   - **서명 키(keystore)와 비밀번호는 분실하면 앱 업데이트가 불가능**하니 안전하게 보관합니다.
3. 주소창 없는 전체화면 앱으로 실행되도록 서버 환경변수를 추가하고 재배포합니다.

   | 값 | 어디서 |
   | --- | --- |
   | `MARTON_ANDROID_PACKAGE` | 2번에서 입력한 패키지 ID |
   | `MARTON_ANDROID_SHA256` | 받은 `assetlinks.json`의 `sha256_cert_fingerprints` 값 (여러 개면 쉼표로) |

   확인: `https://주소/.well-known/assetlinks.json` 이 JSON을 돌려주면 성공.
   > 플레이스토어 "앱 서명"을 쓰면 구글이 재서명하므로, Play Console → 앱 무결성 → 앱 서명 키의 SHA-256도 쉼표로 함께 넣습니다.
4. 배포 방식 선택
   - **사내 배포만**: `.apk`를 MDM(사내 단말 관리) 또는 사내 메신저로 배포
   - **플레이스토어**: Play Console(등록비 1회 $25) → 비공개 테스트 트랙에 `.aab` 업로드 → 매장 직원 이메일을 테스터로 추가

### 앱스토어 (아이폰)

PWABuilder의 iOS 패키지는 Mac + Xcode + Apple 개발자 계정(연 $99)이 필요하고, 웹앱을 감싼 앱은 심사에서 반려되기 쉽습니다. 시범운영 단계에서는 **Safari "홈 화면에 추가"** 를 권장합니다(푸시 알림 포함 동일하게 동작).

---

## 운영 팁

- 데이터 백업: `/data/marton-db.json`을 매일 다른 저장소로 복사
- 관리자 PIN·매장 코드: 분기마다, 퇴사자 발생 시 변경 (환경변수 수정 → 재배포)
- 푸시 키(VAPID)는 첫 실행 때 데이터 파일에 생성됩니다. 데이터 파일을 지우면 모든 직원이 푸시를 다시 켜야 합니다. 고정하려면 `npx web-push generate-vapid-keys`로 만든 값을 `MARTON_VAPID_PUBLIC_KEY`/`MARTON_VAPID_PRIVATE_KEY`에 넣습니다.
- 서버 로그의 `API key should be set when using the Gemini API.` 경고는 `GEMINI_API_KEY`를 넣지 않았을 때 나오는 것으로, AI 기능만 꺼지고 나머지는 정상입니다.
