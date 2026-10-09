import type { PauseReason, PostureState } from '../engine';

/** Deep teal palette: teal surfaces, mint-tinted type, apricot accent. No pure black or white. */
export const colors = {
  bg: '#0F3B36',
  card: '#154842',
  barBg: '#0F3B36',
  fill: '#1D5750',
  text: '#E3F1EB',
  /** Text/icons drawn on an accent-colored surface, e.g. the primary button. */
  onText: '#0F3B36',
  subtext: '#93BBB0',
  tertiary: '#4F7F76',
  separator: '#215650',
  tint: '#F4B183',
  good: '#9FE0C1',
  warning: '#F4B183',
  danger: '#FF8D7E',
  muted: '#6E978E',
};

export const stateColor: Record<PostureState, string> = {
  good: colors.good,
  tilting: colors.warning,
  alerted: colors.danger,
  paused: colors.muted,
};

const SVG_PALETTE = {
  text: colors.text,
  subtext: colors.subtext,
  track: colors.fill,
  separator: colors.separator,
  tint: colors.tint,
  good: colors.good,
  tilting: colors.warning,
  alerted: colors.danger,
  paused: colors.muted,
  surface: colors.card,
};

export type SvgPalette = typeof SVG_PALETTE;

export function useSvgPalette(): SvgPalette {
  return SVG_PALETTE;
}

export const stateLabel: Record<PostureState, string> = {
  good: '바른 자세',
  tilting: '기울어짐 감지',
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
