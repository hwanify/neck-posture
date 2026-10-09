import type { PauseReason, PostureState } from '../engine';

// Monochrome dark palette: color appears only when posture needs attention.
export const colors = {
  bg: '#0A0A0B',
  card: '#151517',
  text: '#F2F2F2',
  subtext: '#8A8A8F',
  border: '#26262A',
  primary: '#F2F2F2',
  primarySoft: '#1C1C1F',
  good: '#F2F2F2',
  goodSoft: '#1C1C1F',
  warning: '#D8B26E',
  warningSoft: '#2A2418',
  danger: '#E2665A',
  dangerSoft: '#2C1A18',
  muted: '#55555A',
  mutedSoft: '#1C1C1F',
};

export const stateColor: Record<PostureState, string> = {
  good: colors.good,
  tilting: colors.warning,
  alerted: colors.danger,
  paused: colors.muted,
};

export const stateSoftColor: Record<PostureState, string> = {
  good: colors.goodSoft,
  tilting: colors.warningSoft,
  alerted: colors.dangerSoft,
  paused: colors.mutedSoft,
};

export const stateLabel: Record<PostureState, string> = {
  good: '바른 자세',
  tilting: '기울어짐 감지',
  alerted: '자세를 바로 해주세요',
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
