import type { PauseReason, PostureState } from '../engine';

// Warm flat-illustration palette: coral brand, navy ink, distinct status colors.
export const colors = {
  bg: '#FFF6F3',
  card: '#FFFFFF',
  text: '#1F2A44',
  subtext: '#6B7489',
  border: '#F0E4E0',
  primary: '#FF6B5B',
  primarySoft: '#FFE3DE',
  navy: '#26335C',
  mustard: '#F7B538',
  skin: '#F6C9A8',
  good: '#22A06B',
  goodSoft: '#DDF4E8',
  warning: '#E99A16',
  warningSoft: '#FFF0D4',
  danger: '#EF4E4A',
  dangerSoft: '#FFE1DF',
  muted: '#A3ABBD',
  mutedSoft: '#F1EEF0',
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
