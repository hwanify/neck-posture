import type { PauseReason, PostureState } from '../engine';

// Quiet, mature palette: warm neutral surfaces, ink text, desaturated status colors.
export const colors = {
  bg: '#F4F3EF',
  card: '#FFFFFF',
  text: '#16171A',
  subtext: '#86868B',
  border: '#E6E4DE',
  primary: '#16171A',
  primarySoft: '#ECEAE4',
  good: '#4F7A63',
  goodSoft: '#E7EFE9',
  warning: '#B98326',
  warningSoft: '#F5EDDD',
  danger: '#B5483F',
  dangerSoft: '#F6E5E2',
  muted: '#A7A6A1',
  mutedSoft: '#EDEBE6',
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
