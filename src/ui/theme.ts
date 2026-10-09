import { Platform, PlatformColor, useColorScheme, type ColorValue } from 'react-native';

import type { PauseReason, PostureState } from '../engine';

/** iOS semantic system colors (adapt to light/dark automatically); light-mode values elsewhere. */
const sys = (name: string, fallback: string): ColorValue => (Platform.OS === 'ios' ? PlatformColor(name) : fallback);

export const colors = {
  bg: sys('systemGroupedBackground', '#F2F2F7'),
  card: sys('secondarySystemGroupedBackground', '#FFFFFF'),
  barBg: sys('systemBackground', '#F9F9F9'),
  fill: sys('tertiarySystemFill', '#7676801F'),
  text: sys('label', '#000000'),
  subtext: sys('secondaryLabel', '#3C3C4399'),
  tertiary: sys('tertiaryLabel', '#3C3C434D'),
  separator: sys('separator', '#3C3C434A'),
  tint: sys('systemBlue', '#007AFF'),
  good: sys('systemGreen', '#34C759'),
  warning: sys('systemOrange', '#FF9500'),
  danger: sys('systemRed', '#FF3B30'),
  muted: sys('systemGray', '#8E8E93'),
};

export const stateColor: Record<PostureState, ColorValue> = {
  good: colors.good,
  tilting: colors.warning,
  alerted: colors.danger,
  paused: colors.muted,
};

/** Plain hex values for SVG drawings, matching the iOS system palette. */
const SVG_PALETTE = {
  light: {
    text: '#000000',
    subtext: '#8E8E93',
    track: '#E5E5EA',
    separator: '#C6C6C8',
    tint: '#007AFF',
    good: '#34C759',
    tilting: '#FF9500',
    alerted: '#FF3B30',
    paused: '#AEAEB2',
    surface: '#FFFFFF',
  },
  dark: {
    text: '#FFFFFF',
    subtext: '#8E8E93',
    track: '#2C2C2E',
    separator: '#38383A',
    tint: '#0A84FF',
    good: '#30D158',
    tilting: '#FF9F0A',
    alerted: '#FF453A',
    paused: '#636366',
    surface: '#1C1C1E',
  },
};

export type SvgPalette = (typeof SVG_PALETTE)['light'];

export function useSvgPalette(): SvgPalette {
  return useColorScheme() === 'dark' ? SVG_PALETTE.dark : SVG_PALETTE.light;
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
