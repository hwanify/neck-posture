import type { PauseReason, PostureState } from '../engine';

/** Warm, soft palette: off-white paper, ink type, pastel gradient surfaces. */
export const colors = {
  bg: '#FAF7F2',
  card: '#FFFFFF',
  barBg: '#FAF7F2',
  fill: '#EFEAE2',
  text: '#141414',
  subtext: '#8C867D',
  tertiary: '#BDB6AC',
  separator: '#ECE6DC',
  tint: '#141414',
  good: '#5E9C7A',
  warning: '#D08A3E',
  danger: '#D2584A',
  muted: '#A8A198',
};

export const stateColor: Record<PostureState, string> = {
  good: colors.good,
  tilting: colors.warning,
  alerted: colors.danger,
  paused: colors.muted,
};

/** Two-stop pastel gradients for the hero card, shifting with posture state. */
export const stateGradient: Record<PostureState, [string, string]> = {
  good: ['#F8D9C4', '#DCD3F6'],
  tilting: ['#F9DDBE', '#F6EBB8'],
  alerted: ['#F7C6BE', '#F9DCCB'],
  paused: ['#EEE8DF', '#E4E0EA'],
};

export const pastel = {
  peach: ['#F8D9C4', '#FBEADF'] as [string, string],
  sage: ['#CFE6D7', '#E4F1E8'] as [string, string],
  lavender: ['#DCD3F6', '#ECE7FB'] as [string, string],
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
