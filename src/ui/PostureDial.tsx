import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { PostureState } from '../engine';
import { type } from './fonts';
import { Text } from './Text';
import { colors, useSvgPalette } from './theme';

const SIZE = 300;
const C = SIZE / 2;
const R = 128;
const STROKE = 18;
/** Display degrees per degree of head tilt, so small tilts are readable on the ring. */
const SCALE = 2;
const MAX_DISPLAY = 90;

const point = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: C + r * Math.sin(rad), y: C - r * Math.cos(rad) };
};

type Props = {
  /** Signed tilt in degrees, positive = user's right. Null when not measuring. */
  angle: number | null;
  enterDeg: number;
  state: PostureState;
  caption: string;
  size?: number;
};

/**
 * Activity-ring style gauge: the colored arc grows from 12 o'clock towards the side the head tilts,
 * with small marks where the alert threshold sits.
 */
export function PostureDial({ angle, enterDeg, state, caption, size = 260 }: Props) {
  const palette = useSvgPalette();
  const color = palette[state];
  const display = angle === null ? 0 : Math.max(-MAX_DISPLAY, Math.min(MAX_DISPLAY, angle * SCALE));
  const start = point(0, R);
  const end = point(display, R);
  const abs = angle === null ? null : Math.round(Math.abs(angle));
  const side = abs === null ? ' ' : abs === 0 ? '정면' : angle! < 0 ? '왼쪽' : '오른쪽';

  const threshold = (deg: number) => {
    const a = point(deg, R - STROKE / 2 - 4);
    const b = point(deg, R - STROKE / 2 - 12);
    return <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={palette.subtext} strokeWidth={2} strokeLinecap="round" />;
  };

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={C} cy={C} r={R} stroke={palette.track} strokeWidth={STROKE} fill="none" />
        {threshold(-enterDeg * SCALE)}
        {threshold(enterDeg * SCALE)}
        {angle !== null &&
          (Math.abs(display) > 1 ? (
            <Path
              d={`M ${start.x} ${start.y} A ${R} ${R} 0 0 ${display > 0 ? 1 : 0} ${end.x} ${end.y}`}
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <Circle cx={start.x} cy={start.y} r={STROKE / 2} fill={color} />
          ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Text style={styles.side}>{side}</Text>
        <Text style={styles.value}>{abs === null ? '–' : `${abs}°`}</Text>
        <Text style={[styles.caption, { color }]}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  side: { ...type.label, fontSize: 13, color: colors.subtext },
  value: {
    ...type.display,
    fontSize: 64,
    letterSpacing: -2.5,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  caption: { ...type.callout },
});
