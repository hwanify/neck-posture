import type { PauseReason, PostureState } from '../engine';

/** Dark palette: black screens, near-white type, graphite groups; color only for status text. */
export const colors = {
  bg: '#000000',
  card: '#141416',
  barBg: '#000000',
  fill: '#232326',
  text: '#F2F2F2',
  /** Text/icons drawn on a `text`-colored (light) surface, e.g. the primary button. */
  onText: '#000000',
  subtext: '#8E8E93',
  tertiary: '#48484A',
  separator: '#26262A',
  tint: '#F2F2F2',
  good: '#7FBF98',
  warning: '#E0A458',
  danger: '#EF6F61',
  muted: '#6C6C70',
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
