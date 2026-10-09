import type { PauseReason, PostureState } from '../engine';

export const colors = {
  bg: '#F4F6F8',
  card: '#FFFFFF',
  text: '#15202B',
  subtext: '#5B6875',
  border: '#E2E7EC',
  primary: '#1F8A70',
  primarySoft: '#DDF2EC',
  warning: '#E89B1C',
  warningSoft: '#FCF0DA',
  danger: '#D64545',
  dangerSoft: '#FBE3E3',
  muted: '#9AA5B1',
  mutedSoft: '#ECEFF2',
};

export const stateColor: Record<PostureState, string> = {
  good: colors.primary,
  tilting: colors.warning,
  alerted: colors.danger,
  paused: colors.muted,
};

export const stateLabel: Record<PostureState, string> = {
  good: '바른 자세',
  tilting: '기울어짐 감지 중',
  alerted: '고개를 바로 세워주세요',
  paused: '일시정지',
};

export const pauseLabel: Record<PauseReason, string> = {
  moving: '움직이는 중',
  walking: '걷는 중',
  disconnected: 'AirPods 신호 없음',
  notCalibrated: '자세 보정 필요',
};

export function formatAngle(angle: number): string {
  const rounded = Math.round(Math.abs(angle));
  if (rounded === 0) return '0°';
  return `${angle < 0 ? '좌' : '우'} ${rounded}°`;
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s % 60}초`;
  return `${s}초`;
}
