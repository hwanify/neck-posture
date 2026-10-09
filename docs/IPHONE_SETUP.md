# iPhone만으로 빌드하고 설치하기

Mac 없이 **iPhone(Safari + GitHub/TestFlight 앱)만으로** 바로목을 설치하는 방법입니다.

```
코드 push ─▶ GitHub Actions ─▶ EAS Build(Expo의 클라우드 Mac) ─▶ TestFlight ─▶ 내 iPhone
                 └─ JS만 바뀐 경우: OTA 업데이트 ─────────────────────────────▶ 앱 재실행 시 반영
```

> 💡 아래 웹사이트들은 iPhone Safari에서 화면이 잘리면 주소창의 `가가` → **데스크톱 웹사이트 요청**을 켜세요.

---

## 0. 준비물과 비용

| 항목 | 비용 | 왜 필요한가 |
| --- | --- | --- |
| Apple Developer Program | 연 129,000원 (US$99) | 직접 만든 앱을 iPhone에 설치(TestFlight)하려면 필수. 무료 계정은 Mac의 Xcode가 있어야만 설치 가능 |
| Expo 계정 | 무료 | EAS Build로 클라우드에서 iOS 앱 빌드 (무료 플랜은 월 빌드 횟수 제한 있음) |
| GitHub | 무료 | 빌드 실행 버튼(Actions), 비밀값 보관 |
| AirPods Pro / Max / 3세대 이상 | — | 헤드 트래킹 센서 |

---

## 1. Apple Developer Program 가입 (최초 1회, 승인까지 최대 48시간)

1. App Store에서 **Apple Developer** 앱 설치
2. 앱 → 계정 → **지금 등록하기** → 개인(Individual)으로 가입·결제

## 2. Expo 토큰 만들기

1. [expo.dev](https://expo.dev) 가입 (GitHub 계정으로 로그인 가능)
2. 우측 상단 프로필 → **Account settings → Access tokens → Create token**
3. 이름 `github` → 생성된 토큰 복사 (한 번만 보임) → 메모장에 임시 보관

## 3. App Store Connect API 키 만들기

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) 로그인
2. **사용자 및 액세스 → 통합(Integrations) → App Store Connect API → 팀 키(Team Keys)**
   (처음이면 "액세스 요청" 후 승인)
3. **+ 키 생성** → 이름 `eas`, 액세스 **관리(Admin)** → 생성
4. 다음 값을 복사해 둡니다
   - **Issuer ID** (표 위쪽에 표시)
   - **키 ID** (방금 만든 키의 Key ID)
5. **API 키 다운로드** (⚠️ 한 번만 가능) → `AuthKey_XXXX.p8` 파일이 **파일 앱 > 다운로드**에 저장됨
6. 파일 앱에서 그 파일을 길게 눌러 **이름 변경** → 끝에 `.txt` 붙이기 → 열어서 **전체 선택 → 복사**
   (`-----BEGIN PRIVATE KEY-----` 부터 `-----END PRIVATE KEY-----` 까지 전부)

## 4. Team ID 확인

[developer.apple.com/account](https://developer.apple.com/account) → **멤버십 세부사항(Membership details)** → **팀 ID** (10자리 영문/숫자)

## 5. GitHub에 비밀값 등록

[github.com/hwanify/neck-posture](https://github.com/hwanify/neck-posture) → **Settings → Secrets and variables → Actions**

**Secrets** 탭 → `New repository secret` 으로 5개 등록:

| Name | 값 |
| --- | --- |
| `EXPO_TOKEN` | 2단계의 Expo 토큰 |
| `ASC_KEY_ID` | 3단계의 키 ID |
| `ASC_ISSUER_ID` | 3단계의 Issuer ID |
| `ASC_API_KEY_P8` | 3단계에서 복사한 .p8 파일 내용 전체 |
| `APPLE_TEAM_ID` | 4단계의 팀 ID |

> 회사/단체 계정으로 가입했다면 **Variables** 탭에 `APPLE_TEAM_TYPE` = `COMPANY_OR_ORGANIZATION` 도 추가.

## 6. 첫 빌드 실행

1. GitHub 저장소 → **Actions → iOS Build → Run workflow**
2. Branch: 개발 브랜치 선택, **Send to TestFlight 체크 해제** → Run
3. 1~2분 후 초록색 ✅ 이 되면 빌드가 Expo 서버에 등록된 것
4. [expo.dev](https://expo.dev) → baromok 프로젝트 → **Builds**에서 진행 상황 확인 (보통 15~30분)

이 첫 빌드 과정에서 번들 ID `com.hwanify.baromok`, 배포 인증서, 프로비저닝 프로파일이 자동으로 만들어집니다.

## 7. App Store Connect에 앱 등록 (최초 1회)

1. App Store Connect → **나의 앱 → + → 신규 앱**
2. 플랫폼 iOS / 이름 `바로목` (이미 쓰이는 이름이면 `바로목 - 목 자세 알림` 등) / 기본 언어 한국어 /
   번들 ID **com.hwanify.baromok** 선택 / SKU `baromok` / 사용자 액세스: 전체 액세스
3. 생성된 앱 → **앱 정보 → 일반 정보 → Apple ID** (숫자 10자리) 복사
4. GitHub → Settings → Secrets and variables → Actions → **Variables** 탭 → `ASC_APP_ID` = 그 숫자

## 8. TestFlight로 보내기

- 6단계 빌드가 이미 끝났다면: **Actions → iOS Submit to TestFlight → Run workflow** (재빌드 없이 제출)
- 이후 새 빌드는: **iOS Build** 를 *Send to TestFlight 체크한 채로* 실행하면 빌드 후 자동 제출

Apple 처리에 10~30분 걸립니다.

## 9. iPhone에 설치

1. App Store Connect → 바로목 → **TestFlight → 내부 테스팅 → +** 그룹 만들기 → 본인 Apple ID 추가
2. 초대 메일 → App Store에서 **TestFlight** 앱 설치 → 바로목 **설치**
3. 앱 실행 → AirPods 착용 → **동작 및 피트니스 허용** → 자세 보정

---

## 이후 개발 흐름

| 변경 종류 | 반영 방법 | 걸리는 시간 |
| --- | --- | --- |
| 화면, 감지 로직, 문구 등 **JS/TS 코드** | push하면 **OTA Update** 워크플로가 자동 배포 → 앱을 완전히 종료 후 두 번 실행(첫 실행에 다운로드, 다음 실행에 적용) | 2~3분 |
| `modules/` Swift 코드, `app.json` 권한·설정, 새 네이티브 패키지 | **iOS Build** 실행 (TestFlight 체크) → TestFlight에서 업데이트 | 30~60분 |

새 바이너리와 OTA 업데이트는 네이티브 코드 지문(fingerprint)으로 자동 매칭되므로, 맞지 않는 업데이트가 설치될 걱정은 없습니다.

## 문제 해결

| 증상 | 해결 |
| --- | --- |
| iOS Build가 `Missing secret` 으로 실패 | 5단계 Secrets 이름 오타 확인 |
| `Apple Team Type` 오류 | Variables에 `APPLE_TEAM_TYPE` 추가 (`INDIVIDUAL` 또는 `COMPANY_OR_ORGANIZATION`) |
| 번들 ID가 이미 사용 중 | `app.json`의 `ios.bundleIdentifier`를 바꿔달라고 요청 |
| 앱에서 "데모 모드"로 표시 | 네이티브 모듈 없는 빌드. iOS Build로 새로 빌드 |
| "AirPods를 착용해주세요"에서 멈춤 | 헤드 트래킹 지원 모델인지, 양쪽 착용했는지, 설정 > 개인정보 보호 > 동작 및 피트니스 확인 |
| 측정 중 화면을 끄면 알림이 안 옴 | 설정 탭 → 백그라운드 감지 켜기 / 결과를 알려주세요 (실기기 검증 필요 항목) |
