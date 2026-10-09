# 기술 설계서 (Tech Spec)

## 1. 기술 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 프레임워크 | **Expo (React Native) + TypeScript** | 빠른 개발, EAS Build로 iOS 빌드/배포 간편 |
| 네이티브 연동 | **Expo Modules API (Swift)** 로 자체 모듈 `headphone-motion` 작성 | `CMHeadphoneMotionManager`는 RN 기본 API에 없음. 직접 만들어야 이벤트 주기·백그라운드 동작을 통제 가능 |
| 빌드 | Expo **Development Build** (Expo Go 불가) | 커스텀 네이티브 모듈 포함 |
| 라우팅 | expo-router | 파일 기반 라우팅 |
| 상태 관리 | Zustand | 가볍고 센서 스트림 상태 관리에 충분 |
| 로컬 저장 | expo-sqlite (세션·이벤트) + MMKV/AsyncStorage (설정·캘리브레이션) | 서버 없이 기기 내 저장 |
| 애니메이션 | react-native-reanimated + react-native-svg | 머리 일러스트 실시간 회전 |
| 알림 | expo-notifications(로컬), expo-haptics, expo-audio(알림음) | |
| 차트 | victory-native (v1.1) | 통계 화면 |
| 테스트 | Jest (감지 알고리즘 단위 테스트) | 알고리즘은 순수 TS 함수로 분리 |

> ⚠️ 개발 환경: **macOS + Xcode + 실제 iPhone + 지원 AirPods** 필요.
> iOS 시뮬레이터는 헤드폰 모션을 지원하지 않는다. 그래서 개발용 **Mock 모션 소스**(슬라이더/녹화 데이터 재생)를 함께 만든다.

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

## 3. 네이티브 모듈 API (안)

```ts
// modules/headphone-motion/index.ts
export type MotionSample = {
  timestamp: number;                       // seconds
  quaternion: { x: number; y: number; z: number; w: number };
  gravity: { x: number; y: number; z: number };
  rotationRate: { x: number; y: number; z: number };   // rad/s
  userAcceleration: { x: number; y: number; z: number }; // g
};

isAvailable(): boolean;                     // 기기/OS가 헤드폰 모션 지원하는지
getAuthorizationStatus(): 'notDetermined' | 'restricted' | 'denied' | 'authorized';
start(): Promise<void>;                     // 권한 요청 포함
stop(): void;
addMotionListener(cb: (s: MotionSample) => void): Subscription;
addConnectionListener(cb: (e: { connected: boolean }) => void): Subscription;
```

- 이벤트 빈도: 센서는 약 25Hz 내외로 들어오는 것으로 알려져 있음(PoC에서 실측). 브리지 부하를 줄이기 위해 필요 시 네이티브에서 10~15Hz로 다운샘플.
- `Info.plist`: `NSMotionUsageDescription`, `UIBackgroundModes: [audio]` → Expo config plugin으로 주입.

## 4. 기울기 감지 알고리즘

### 4.1 캘리브레이션
- 사용자가 바른 자세로 정면을 보는 3초 동안 쿼터니언을 수집 → 평균(정규화) → `q_ref` 저장.
- 3초 동안 각속도가 크면(움직임) 다시 측정 요청.
- 이어폰을 뺐다 다시 끼면 착용 각도가 바뀔 수 있으므로 **재연결 시 재캘리브레이션 권장** 토스트.

### 4.2 좌우 기울기 계산
1. 상대 회전: `q_rel = conj(q_ref) ⊗ q_now`
2. `q_rel`에서 머리의 앞뒤 축(전방 축) 기준 회전 성분 = 좌우 기울기(roll)
   - `roll = atan2(2(w·x + y·z), 1 − 2(x² + y²))` 형태 (어느 축이 전방 축인지는 **PoC에서 실측으로 확정**)
   - 대안: gravity 벡터를 기준 gravity와 비교해 좌우 성분만 각도로 환산 — yaw(좌우로 돌아보기) 영향이 적음. 두 방식 비교 후 선택.
3. 부호 규칙: 왼쪽 기울기 = 음수, 오른쪽 = 양수 (UI·리포트 공통)

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

## 6. 데이터 모델 (SQLite)

```sql
CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  started_at    INTEGER NOT NULL,   -- epoch ms
  ended_at      INTEGER,
  good_ms       INTEGER DEFAULT 0,  -- 바른 자세 누적 시간
  tilt_ms       INTEGER DEFAULT 0,  -- 기울어진 누적 시간
  paused_ms     INTEGER DEFAULT 0,
  alert_count   INTEGER DEFAULT 0,
  left_tilt_ms  INTEGER DEFAULT 0,
  right_tilt_ms INTEGER DEFAULT 0,
  avg_abs_angle REAL
);

CREATE TABLE alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL REFERENCES sessions(id),
  at          INTEGER NOT NULL,
  angle       REAL NOT NULL,        -- 경고 시점 각도 (음수=왼쪽)
  recovered_ms INTEGER              -- 경고 후 복귀까지 걸린 시간
);

-- 세션 타임라인 그래프용: 1초 단위 다운샘플 각도
CREATE TABLE samples (
  session_id TEXT NOT NULL,
  t          INTEGER NOT NULL,      -- 세션 시작 기준 초
  angle      REAL NOT NULL,
  PRIMARY KEY (session_id, t)
);
```

설정(KV): `calibration.q_ref`, `threshold.enterDeg`, `threshold.exitDeg`, `alert.holdSec`, `alert.cooldownSec`, `feedback.sound|haptic|push`.

## 7. 프로젝트 구조 (안)

```
neck-posture/
├─ app/                        # expo-router
│  ├─ (onboarding)/
│  ├─ (tabs)/index.tsx         # 홈
│  ├─ (tabs)/history.tsx
│  ├─ (tabs)/settings.tsx
│  └─ calibrate.tsx
├─ modules/headphone-motion/   # Expo native module (Swift)
│  ├─ ios/HeadphoneMotionModule.swift
│  └─ index.ts
├─ src/
│  ├─ engine/                  # 순수 TS, 단위 테스트 대상
│  │  ├─ quaternion.ts
│  │  ├─ tiltEstimator.ts
│  │  ├─ filters.ts
│  │  └─ postureStateMachine.ts
│  ├─ sources/                 # NativeMotionSource, MockMotionSource
│  ├─ services/                # feedback, sessionRecorder, storage
│  ├─ store/                   # zustand
│  └─ components/              # HeadVisual, AngleGauge ...
├─ plugins/withHeadphoneMotion.js  # Info.plist 주입 config plugin
└─ docs/
```

## 8. 테스트 전략

- **엔진 단위 테스트**: 합성 쿼터니언 시퀀스(정자세 → 12° 기울임 6초 → 복귀)로 상태 전이·경고 횟수 검증.
- **녹화 재생 테스트**: PoC에서 실기기 센서 로그를 JSON으로 녹화 → MockMotionSource로 재생해 회귀 테스트.
- **실기기 QA 체크리스트**: 이어폰 한쪽만 착용, 연결 끊김/재연결, 통화 중, 다른 앱 음악 재생 중, 화면 잠금 30분.
