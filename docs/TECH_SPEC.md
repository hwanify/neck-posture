# 기술 설계서 (Tech Spec)

## 1. 기술 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 프레임워크 | **Expo (React Native) + TypeScript** | 빠른 개발, EAS Build로 iOS 빌드/배포 간편 |
| 네이티브 연동 | **Expo Modules API (Swift)** 로 자체 모듈 `headphone-motion` 작성 | `CMHeadphoneMotionManager`는 RN 기본 API에 없음. 직접 만들어야 이벤트 주기·백그라운드 동작을 통제 가능 |
| 빌드 | EAS Build 프로덕션 빌드 (Expo Go 불가) | 커스텀 네이티브 모듈 포함 |
| 화면 전환 | 간단한 탭 상태 (라우터 없음) | 화면 4개뿐이라 의존성 최소화 |
| 상태 관리 | `useSyncExternalStore` + 단일 `MonitorController` | 추가 라이브러리 없이 센서 스트림 상태 관리 |
| 로컬 저장 | AsyncStorage (설정·보정값·세션 요약 최대 200개) | MVP 규모에 충분. 원시 샘플이 필요해지면 SQLite로 이전 |
| 그래픽 | react-native-svg | 머리 일러스트, 세션 타임라인 |
| 알림 | 알림음: 네이티브 `AVAudioEngine` 합성음(좌우 pan) / expo-haptics / expo-notifications(로컬) | 음악을 끊지 않고 섞어서 재생 |
| 배포 | EAS Build + TestFlight, EAS Update(OTA) | Mac 없이 iPhone만으로 개발 (docs/IPHONE_SETUP.md) |
| 테스트 | Jest (감지 알고리즘 단위 테스트) | 알고리즘은 순수 TS 함수로 분리 |

> ⚠️ 개발 환경: **Mac 없이 iPhone만** 사용한다. 빌드는 EAS(클라우드 Mac)에서, 설치는 TestFlight로 한다.
> 네이티브 모듈이 없는 환경(웹, 테스트)에서는 자동으로 **데모 모션 소스**(가상 기울기 데이터)를 사용한다.

## 2. 아키텍처

```
┌─────────────────────────── iOS Native (Swift) ───────────────────────────┐
│  HeadphoneMotionModule                                                   │
│   ├─ CMHeadphoneMotionManager.startDeviceMotionUpdates(to:)               │
│   ├─ CMHeadphoneMotionManagerDelegate (connect / disconnect)             │
│   └─ AVAudioSession 관리 (백그라운드 유지, 알림음 mix)                    │
│        │  events: onMotion(quaternion, gravity, rotationRate, ts)         │
│        │          onConnectionChange(connected)                           │
└────────┼─────────────────────────────────────────────────────────────────┘
         ▼
┌─────────────────────────── JS / TypeScript ──────────────────────────────┐
│  MotionSource (interface)  ← NativeMotionSource | MockMotionSource       │
│        ▼                                                                  │
│  PostureEngine (순수 TS)                                                  │
│   ├─ Calibration      : 기준 자세 쿼터니언 저장                            │
│   ├─ TiltEstimator    : 기준 대비 상대 회전 → 좌우 기울기 각도(°)          │
│   ├─ Filter           : EMA 저역통과 + 움직임 게이트                        │
│   └─ PostureStateMachine : GOOD / TILTING / ALERT / COOLDOWN / PAUSED      │
│        ▼ events                                                           │
│  FeedbackService (사운드·햅틱·로컬알림)    SessionRecorder (SQLite)          │
│        ▼                                                                  │
│  UI (expo-router screens, Zustand store)                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**원칙**: 네이티브는 "센서 데이터를 흘려보내는 얇은 층", 판단 로직은 전부 TS에 둬서 단위 테스트 가능하게 한다.
(백그라운드에서 JS 실행이 불안정하다고 PoC에서 확인되면 PostureEngine을 Swift로 이식하는 것이 Plan B.)

## 3. 네이티브 모듈 API

```ts
// modules/headphone-motion (requireOptionalNativeModule → 네이티브가 없으면 null)
type MotionSample = {
  timestamp: number;                                     // 부팅 후 초
  quaternion: { x; y; z; w };
  gravity: { x; y; z };
  rotationRate: { x; y; z };                             // rad/s
  userAcceleration: { x; y; z };                         // g
  sensorLocation: 'default' | 'left' | 'right';          // 어느 쪽 이어폰 센서인지
};

isAvailable(): boolean;
isActive(): boolean;
getAuthorizationStatus(): 'notDetermined' | 'restricted' | 'denied' | 'authorized';
startUpdates(): Promise<void>;                           // 첫 호출 시 권한 팝업
stopUpdates(): Promise<void>;
setBackgroundKeepAlive(enabled: boolean): Promise<void>; // 무음 루프 재생으로 백그라운드 유지
playCue(kind: 'alert' | 'good' | 'tick', pan: number, volume: number): Promise<void>;
// events: onMotion(MotionSample), onConnectionChange({ connected }), onError({ code, domain, message })
```

- 이벤트 빈도: 센서는 약 25Hz 내외로 알려져 있음 — 설정 탭 '진단 정보'에서 실측값 확인 가능.
- `Info.plist`: `NSMotionUsageDescription`, `UIBackgroundModes: [audio]` → `app.json`의 `ios.infoPlist`로 주입.

## 4. 기울기 감지 알고리즘

### 4.1 캘리브레이션 (2단계) — `src/engine/calibrator.ts`
AirPods 센서 좌표축이 어느 방향인지, 이어폰이 귀에 어떤 각도로 걸렸는지 **가정하지 않고** 측정한다.
1. **바른 자세 3초**: 각속도가 작을 때의 중력 벡터 평균 → `neutralGravity` (움직이면 처음부터 다시)
2. **오른쪽으로 기울이기**: 중력 벡터가 기준에서 12° 이상 벗어난 상태를 0.6초 유지 →
   `forwardAxis = normalize(neutral × tilted)` — 이 축 기준 양(+)의 회전이 "오른쪽 기울기"
- 사용자가 반대로 기울였을 때를 위해 "좌우 방향 바꾸기"(축 부호 반전) 제공
- 보정 당시 센서 위치(왼/오른 이어폰)를 저장, 다른 쪽 센서로 바뀌면 재보정 권장 배너

### 4.2 좌우 기울기 계산 — `src/engine/tilt.ts`
- 쿼터니언 대신 **중력 벡터**를 사용: yaw 드리프트가 없고, 고개를 좌우로 돌리는 동작(yaw)에 영향받지 않음
- 기준 중력과 현재 중력을 `forwardAxis`에 수직인 평면에 투영한 뒤 두 벡터의 부호 있는 각도:
  `θ = atan2(f · (r × c), r · c)` → 끄덕임(pitch)은 투영으로 제거됨 (단위 테스트로 검증)
- 부호 규칙: 왼쪽 = 음수, 오른쪽 = 양수

### 4.3 필터링 / 오탐 방지
- **EMA 저역통과**: `θ_f = α·θ + (1−α)·θ_f` (α ≈ 0.2) — 미세 떨림 제거
- **움직임 게이트**: `|rotationRate|`가 임계값 이상(예: 1.0 rad/s)이면 해당 구간은 판정 보류 → 두리번거림/고개 끄덕임 무시
- **보행 감지**: `userAcceleration` 분산이 크면 PAUSED (걷는 중엔 감지 안 함)
- **히스테리시스**: 진입 임계 10°, 복귀 임계 7° → 경계에서 깜빡임 방지

### 4.4 상태 머신

```
            |θ| ≥ 진입각
   GOOD ───────────────────▶ TILTING (타이머 시작)
    ▲  ◀──────────────────── │
    │     |θ| < 복귀각        │ 지속시간(5s) 경과
    │                        ▼
    │                      ALERT  ── 알림 발생(방향 포함) ──▶ COOLDOWN(30s)
    │  |θ| < 복귀각                                              │
    └────────────────────────────────────────────────────────────┘
   (어느 상태든) 이어폰 해제 / 큰 움직임 / 보행 → PAUSED → 조건 해소 시 GOOD
```

- 경고를 계속 무시하면 쿨다운을 30s → 60s → 120s로 증가(백오프), 자세 회복 시 초기화.

## 5. 백그라운드 동작 (최대 기술 리스크)

목표: 화면이 꺼지거나 다른 앱을 사용 중에도 감지 지속.

| 방안 | 내용 | 장점 | 단점/리스크 |
| --- | --- | --- | --- |
| A. 백그라운드 오디오 + 집중 사운드 | 앱이 백색소음 등 실제 오디오를 재생하는 동안 앱이 살아있음 | 정책상 정당한 오디오 사용 | 사용자가 다른 음악 앱을 쓰고 싶을 때 충돌 |
| B. 무음 오디오 mix 재생 | `mixWithOthers`로 무음 재생해 앱 유지 | 사용자 음악과 공존 | **App Store 리젝 위험(2.5.4)** |
| C. 포그라운드 전용 | 앱이 켜져 있을 때만 감지 (화면 꺼짐 방지 옵션) | 구현 단순, 심사 안전 | 사용성 크게 저하 |

- **결정 방법**: M0 PoC에서 실기기로 ① 백그라운드 진입 후 헤드폰 모션 업데이트가 계속 오는지, ② 다른 앱 음악 재생 중에도 오는지, ③ 화면 잠금 후 30분 이상 유지되는지 측정.
- 잠정안: **A를 기본 + C를 폴백**. B는 심사 리스크 때문에 채택하지 않는 것을 기본으로 한다.
- **현재 구현(PoC)**: 백그라운드 동작 여부를 실기기로 빨리 확인하기 위해 B를 설정 토글("백그라운드 감지")로 넣어둠.
  TestFlight 내부 테스트 전용이며, 스토어 출시 전 A(집중 사운드 재생)로 전환한다.

## 6. 데이터 모델 (AsyncStorage, JSON)

```ts
type SessionSummary = {
  id: string; startedAt: number; endedAt: number;
  goodSec: number; tiltSec: number; pausedSec: number;
  leftTiltSec: number; rightTiltSec: number;
  alertCount: number; avgAbsAngle: number;
  timeline: (number | null)[]; // 5초 단위 평균 각도, 일시정지 구간은 null
};
```

키: `baromok.settings.v1`, `baromok.calibration.v1`, `baromok.sessions.v1`(최신순 최대 200개), `baromok.onboarded.v1`

## 7. 프로젝트 구조

```
neck-posture/
├─ App.tsx                     # 탭 + 온보딩/보정 화면 전환
├─ modules/headphone-motion/   # Expo 로컬 네이티브 모듈 (iOS)
│  ├─ ios/HeadphoneMotionModule.swift   # CMHeadphoneMotionManager → JS 이벤트
│  ├─ ios/CuePlayer.swift               # 좌/우 pan 알림음 + 백그라운드 유지용 무음 루프
│  └─ src/                              # TS 타입·래퍼 (네이티브 없으면 null)
├─ src/
│  ├─ engine/                  # 순수 TS 감지 엔진 + Jest 테스트
│  ├─ services/                # motionSource(AirPods/데모), feedback, storage
│  ├─ state/monitor.ts         # 스트리밍·보정·세션 상태 관리
│  ├─ screens/                 # Home, Calibration, History, Settings, Onboarding
│  └─ ui/                      # 공통 컴포넌트, HeadVisual, Sparkline
├─ scripts/ci-configure-submit.js
├─ .github/workflows/          # ci, ios-build, ios-submit, ota-update
└─ docs/
```

## 8. 테스트 전략

- **엔진 단위 테스트**: 합성 쿼터니언 시퀀스(정자세 → 12° 기울임 6초 → 복귀)로 상태 전이·경고 횟수 검증.
- **녹화 재생 테스트**: PoC에서 실기기 센서 로그를 JSON으로 녹화 → MockMotionSource로 재생해 회귀 테스트.
- **실기기 QA 체크리스트**: 이어폰 한쪽만 착용, 연결 끊김/재연결, 통화 중, 다른 앱 음악 재생 중, 화면 잠금 30분.
