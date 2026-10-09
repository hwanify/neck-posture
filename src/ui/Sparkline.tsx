import Svg, { Line, Polyline } from 'react-native-svg';

import { useSvgPalette } from './theme';

/** Tilt timeline: center line = straight, up = right, down = left. */
export function Sparkline({
  values,
  width,
  height,
  limitDeg,
}: {
  values: (number | null)[];
  width: number;
  height: number;
  limitDeg: number;
}) {
  const palette = useSvgPalette();
  const range = Math.max(limitDeg * 2, 20);
  const mid = height / 2;
  const y = (v: number) => mid - (Math.max(-range, Math.min(range, v)) / range) * (height / 2);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  // Break the line where the session was paused.
  const segments: string[] = [];
  let current: string[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
    } else {
      current.push(`${(i * step).toFixed(1)},${y(v).toFixed(1)}`);
    }
  });
  if (current.length > 1) segments.push(current.join(' '));

  return (
    <Svg width={width} height={height}>
      <Line x1={0} x2={width} y1={y(limitDeg)} y2={y(limitDeg)} stroke={palette.separator} strokeDasharray="3 3" />
      <Line x1={0} x2={width} y1={y(-limitDeg)} y2={y(-limitDeg)} stroke={palette.separator} strokeDasharray="3 3" />
      <Line x1={0} x2={width} y1={mid} y2={mid} stroke={palette.separator} />
      {segments.map((points, i) => (
        <Polyline key={i} points={points} stroke={palette.tint} strokeWidth={2} strokeLinejoin="round" fill="none" />
      ))}
    </Svg>
  );
}
