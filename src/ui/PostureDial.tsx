import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { colors } from './theme';

const SIZE = 300;
const C = SIZE / 2;
const R = 138;
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
  color: string;
  caption: string;
  size?: number;
};

/** A single hairline ring: a dot follows the tilt, two short marks show the alert threshold. */
export function PostureDial({ angle, enterDeg, color, caption, size = 300 }: Props) {
  const display = angle === null ? 0 : Math.max(-MAX_DISPLAY, Math.min(MAX_DISPLAY, angle * SCALE));
  const needle = point(display, R);
  const start = point(0, R);
  const abs = angle === null ? null : Math.round(Math.abs(angle));
  const side = abs === null || abs === 0 ? ' ' : angle! < 0 ? 'L' : 'R';

  const mark = (deg: number, inner: number, outer: number, stroke: string, key: string) => {
    const a = point(deg, inner);
    const b = point(deg, outer);
    return <Line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={1.5} strokeLinecap="round" />;
  };

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={C} cy={C} r={R} stroke={colors.border} strokeWidth={1} fill="none" />
        {mark(0, R - 10, R + 10, colors.subtext, 'top')}
        {mark(-enterDeg * SCALE, R - 5, R + 5, colors.muted, 'l')}
        {mark(enterDeg * SCALE, R - 5, R + 5, colors.muted, 'r')}
        {angle !== null && Math.abs(display) > 0.5 && (
          <Path
            d={`M ${start.x} ${start.y} A ${R} ${R} 0 0 ${display > 0 ? 1 : 0} ${needle.x} ${needle.y}`}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
        )}
        {angle !== null && <Circle cx={needle.x} cy={needle.y} r={5} fill={color} />}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Text style={styles.side}>{side}</Text>
        <Text style={styles.value}>
          {abs === null ? '–' : abs}
          <Text style={styles.degree}>{abs === null ? '' : '°'}</Text>
        </Text>
        <Text style={[styles.caption, { color }]}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  side: { fontSize: 12, color: colors.subtext, letterSpacing: 3, height: 16 },
  value: {
    fontSize: 96,
    fontWeight: '100',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -4,
    lineHeight: 110,
  },
  degree: { fontSize: 48, fontWeight: '100', color: colors.subtext },
  caption: { fontSize: 13, letterSpacing: 0.5, marginTop: 6 },
});
