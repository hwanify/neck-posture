# Expo Go로 테스트하기 (iPhone만, 무료)

Apple 개발자 계정 없이 **Expo 계정 하나로** 바로 앱을 열어볼 수 있는 방법입니다.

```
코드 push ─▶ GitHub Actions "Expo Go Preview" ─▶ EAS Update(expo-go 브랜치) ─▶ iPhone의 Expo Go 앱
```

## Expo Go에서 되는 것 / 안 되는 것

| 기능 | Expo Go | TestFlight 빌드 |
| --- | --- | --- |
| 화면 전체 (온보딩·홈·보정·기록·설정) | ✅ | ✅ |
| 자세 보정, 기울기 감지, 알림 로직 | ✅ **iPhone 센서**로 (폰을 머리처럼 기울임) | ✅ AirPods 센서 |
| 진동 알림 (화면 켜져 있을 때) | ✅ | ✅ |
| **AirPods 헤드 트래킹** | ❌ Expo Go에 모듈이 없음 | ✅ |
| 좌/우 귀 알림음, 백그라운드 감지 | ❌ | ✅ |

> Expo Go에는 직접 만든 네이티브(Swift) 코드를 넣을 수 없어서, AirPods 센서 대신 iPhone 자체의 모션 센서를 씁니다.
> 감지 로직은 똑같아서 보정·각도·알림 타이밍을 실제로 확인해볼 수 있어요. 설정 탭에서 "데모"(가상 데이터 자동 재생)로 바꿀 수도 있어요.

---

## 1. Expo Go 설치 + 로그인

1. App Store에서 **Expo Go** 설치
2. [expo.dev](https://expo.dev) 가입 (GitHub 계정 로그인 가능)
3. Expo Go 앱 → 프로필(Settings) → **같은 Expo 계정으로 로그인**

## 2. Expo 토큰을 GitHub에 등록

1. expo.dev → 우측 상단 프로필 → **Account settings → Access tokens → Create token** → 이름 `github` → 복사
2. [github.com/hwanify/neck-posture](https://github.com/hwanify/neck-posture) → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `EXPO_TOKEN` / Secret: 복사한 토큰

> Safari에서 GitHub 설정 화면이 잘리면 주소창 `가가` → **데스크톱 웹사이트 요청**

## 3. 앱 올리기

GitHub 저장소 → **Actions → Expo Go Preview → Run workflow** (브랜치: 개발 브랜치) → Run

2~3분 뒤 ✅ 가 되면, 실행 기록을 눌러 **Summary**에 나온 방법 중 하나로 엽니다.

1. **업데이트 페이지 링크** → expo.dev 페이지에서 *Preview / Open with Expo Go*
2. `exp://u.expo.dev/update/...` 주소를 복사해 **Safari 주소창에 붙여넣기** → Expo Go로 열림
3. Expo Go 홈 → **Projects → baromok → 브랜치 `expo-go`** → 최신 업데이트

이후에는 제가 코드를 push할 때마다 자동으로 새 버전이 올라갑니다. Expo Go에서 앱을 다시 열면 최신 버전이에요.

## 4. 테스트해보기 (iPhone 센서 모드)

1. 시작하기 → **동작 및 피트니스 허용**
2. **자세 보정 시작**
   - 1단계: iPhone을 세로로 똑바로 세워 들고 3초간 가만히
   - 2단계: 화면을 보며 iPhone 윗부분을 **오른쪽으로 15° 정도** 기울이고 잠깐 멈춤
   - 완료 화면에서 오른쪽으로 기울이면 "우", 왼쪽은 "좌"로 나오는지 확인 (반대면 "좌우가 반대예요")
3. **측정 시작** → iPhone을 10° 넘게 5초 이상 기울여두면 화면이 빨갛게 바뀌고 진동
4. 바로 세우면 초록색으로 복귀 → 측정 종료 → **기록** 탭에서 좌/우 편향과 그래프 확인
5. 설정 탭에서 알림 각도·유지 시간을 바꿔가며 느낌 확인

## 문제 해결

| 증상 | 해결 |
| --- | --- |
| Expo Go Preview가 바로 끝나고 아무것도 안 올라감 | `EXPO_TOKEN` 시크릿 이름 확인 |
| 링크를 열면 "not found" / 권한 오류 | Expo Go에 토큰을 만든 것과 **같은 Expo 계정**으로 로그인했는지 확인 |
| "Expo Go가 이 SDK 버전을 지원하지 않음" | App Store에서 Expo Go 최신 버전으로 업데이트 (이 앱은 Expo SDK 57) |
| 권한 거부로 센서가 안 움직임 | 설정 앱 → Expo Go → 동작 및 피트니스 켜기 |
