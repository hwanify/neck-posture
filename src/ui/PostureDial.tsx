import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { colors } from './theme';

const SIZE = 300;
const C = SIZE / 2;
const R = 128;
/** Display degrees per degree of head tilt, so small tilts are readable on the bezel. */
const SCALE = 2;
const MAX_DISPLAY = 90;

const point = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: C + r * Math.sin(rad), y: C - r * Math.cos(rad) };
};

type Props = {
  /** Signed tilt in degrees, positive = user's right. */
  angle: number | null;
  enterDeg: number;
  color: string;
  caption: string;
  size?: number;
};

/**
 * Watch-bezel style dial: a needle on the rim follows the head tilt, the arc from the top shows
 * how far it has drifted, and ticks inside the alert zone are tinted.
 */
export function PostureDial({ angle, enterDeg, color, caption, size = 280 }: Props) {
  const display = angle === null ? 0 : Math.max(-MAX_DISPLAY, Math.min(MAX_DISPLAY, angle * SCALE));
  const zone = enterDeg * SCALE;
  const needle = point(display, R);
  const start = point(0, R);
  const abs = angle === null ? null : Math.round(Math.abs(angle));
  const side = abs === null ? '' : abs === 0 ? '정면' : angle! < 0 ? '왼쪽' : '오른쪽';

  const ticks = [];
  for (let d = -174; d <= 180; d += 6) {
    const inZone = Math.abs(d) >= zone && Math.abs(d) <= MAX_DISPLAY;
    const major = d === 0;
    const p1 = point(d, R + 10);
    const p2 = point(d, R + (major ? 22 : 16));
    ticks.push(
      <Line
        key={d}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={major ? colors.text : inZone ? colors.danger : colors.border}
        strokeWidth={major ? 2 : 1.5}
        strokeLinecap="round"
        opacity={inZone ? 0.55 : 1}
      />,
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {ticks}
        <Circle cx={C} cy={C} r={R} stroke={colors.border} strokeWidth={1.5} fill="none" />
        {angle !== null && Math.abs(display) > 0.5 && (
          <Path
            d={`M ${start.x} ${start.y} A ${R} ${R} 0 0 ${display > 0 ? 1 : 0} ${needle.x} ${needle.y}`}
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        )}
        {angle !== null && (
          <Circle cx={needle.x} cy={needle.y} r={8} fill={color} stroke={colors.card} strokeWidth={3} />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Text style={styles.side}>{side}</Text>
        <Text style={styles.value}>
          {abs === null ? '—' : abs}
          {abs !== null && <Text style={styles.degree}>°</Text>}
        </Text>
        <Text style={[styles.caption, { color }]}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  side: { fontSize: 13, color: colors.subtext, letterSpacing: 1, height: 18 },
  value: { fontSize: 76, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -2 },
  degree: { fontSize: 40, fontWeight: '200', color: colors.subtext },
  caption: { fontSize: 14, fontWeight: '600', marginTop: 2 },
});
