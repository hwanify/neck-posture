import type { PauseReason, PostureState } from '../engine';
import { t } from '../i18n';

/** Monochrome: black surfaces, white type, grays for everything else — no hues anywhere. */
export const colors = {
  bg: '#000000',
  card: '#141414',
  barBg: '#000000',
  fill: '#242424',
  text: '#F2F2F2',
  /** Text/icons drawn on a light (tint) surface, e.g. the primary button. */
  onText: '#000000',
  subtext: '#8E8E8E',
  tertiary: '#4A4A4A',
  separator: '#262626',
  tint: '#F2F2F2',
  good: '#F2F2F2',
  warning: '#B0B0B0',
  danger: '#FFFFFF',
  muted: '#6B6B6B',
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

export const stateLabel = (state: PostureState): string => t(`state.${state}`);

export const pauseLabel = (reason: PauseReason): string => t(`pause.${reason}`);

export function formatAngle(angle: number): string {
  const deg = Math.round(Math.abs(angle));
  if (deg === 0) return '0°';
  return t(angle < 0 ? 'angle.left' : 'angle.right', { deg });
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return t('duration.hm', { h, m });
  if (m > 0) return t('duration.ms', { m, s: s % 60 });
  return t('duration.s', { s });
}
