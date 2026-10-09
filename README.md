# 바로목 (가칭) — AirPods로 목 기울기 교정

AirPods의 헤드 트래킹 센서로 **목이 좌우로 기울어진 것**을 감지하고,
일정 시간 이상 기울어져 있으면 소리·진동으로 알려 바른 자세를 만들어주는 iOS 앱입니다.

- 플랫폼: iOS (React Native / Expo)
- 센서: `CMHeadphoneMotionManager` (AirPods Pro · Max · 3세대 이상 등)
- 데이터: 기기 내에만 저장 (서버 없음)

## 문서

- 🧪 [Expo Go로 테스트하기](docs/EXPO_GO.md) — Expo 계정만으로 바로 열어보기 (iPhone 센서로 대체 테스트, 무료)
- 📱 [iPhone만으로 빌드·설치하기](docs/IPHONE_SETUP.md) — AirPods 센서까지 쓰는 실제 앱을 TestFlight로 설치
- [제품 기획서 (PRD)](docs/PRD.md) — 문제 정의, 타겟, 기능 명세, 화면 구성, 알림 UX
- [기술 설계서 (Tech Spec)](docs/TECH_SPEC.md) — 아키텍처, 네이티브 모듈 API, 감지 알고리즘, 백그라운드 전략, 데이터 모델

## 현재 상태 (v0.1 — PoC + MVP 초안)

- [x] AirPods 헤드 모션 네이티브 모듈 (Swift, Expo Modules) + 좌/우 방향 알림음
- [x] 감지 엔진: 2단계 자세 보정, 중력 기반 좌우 기울기, 필터·움직임/보행 게이트, 상태 머신 (Jest 테스트)
- [x] 화면: 온보딩, 홈(실시간 시각화·측정), 자세 보정, 기록(좌우 편향·타임라인), 설정
- [x] 백그라운드 감지(실험), 로컬 알림, 진동
- [x] GitHub Actions → EAS Build → TestFlight, push 시 OTA 업데이트
- [x] Expo Go 미리보기 (push 시 자동 배포, AirPods 대신 iPhone 모션 센서 사용)
- [ ] 실기기 검증: 센서 수신 빈도, 백그라운드 유지 시간, 기본 임계값 튜닝

## 로드맵

| 단계 | 기간(예상) | 내용 | 완료 기준 |
| --- | --- | --- | --- |
| **M0. 기술 검증 (PoC)** | 1주 | Expo 프로젝트 + Swift 네이티브 모듈로 AirPods 모션 수신, 센서 로그 녹화 | 실기기에서 좌우 기울기 각도가 화면에 표시되고, 백그라운드 동작 여부 측정 완료 |
| **M1. 감지 엔진** | 1주 | 캘리브레이션, 기울기 계산, 필터, 상태 머신 + 단위 테스트 | 녹화 데이터 재생 시 기대한 경고 횟수 재현 |
| **M2. MVP 앱** | 2주 | 온보딩, 홈(실시간 시각화), 경고(사운드·햅틱·푸시), 세션 기록, 설정 | 사내/지인 TestFlight 배포 |
| **M3. 튜닝 & 출시** | 1~2주 | 베타 피드백으로 기본 임계값·오탐 튜닝, 스토어 자료 준비 | App Store 심사 통과 |
| v1.1 이후 | — | 통계 차트, 집중 사운드, 스트레칭 리마인더, 거북목(pitch) 감지 | — |

## 개발 환경

- **Mac 불필요** — 빌드는 EAS 클라우드, 설치는 TestFlight ([가이드](docs/IPHONE_SETUP.md))
- 로컬/CI 검사: `npm ci && npm run typecheck && npm test` (Node 22)
- 네이티브 모듈이 없는 환경(Expo Go)에서는 iPhone 모션 센서 또는 데모(가상 데이터)로 동작
