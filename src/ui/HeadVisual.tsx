import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { colors } from './theme';

/** Head that tilts with the measured angle (positive = user's right). */
export function HeadVisual({ angle, color, enterDeg }: { angle: number; color: string; enterDeg: number }) {
  // Drawn like a mirror: tilting to your right tilts the head towards the right of the screen.
  const rotation = Math.max(-35, Math.min(35, angle));
  const pivotX = 100;
  const pivotY = 150;
  const guide = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return { x2: pivotX + Math.sin(r) * 120, y2: pivotY - Math.cos(r) * 120 };
  };

  return (
    <Svg width={200} height={200} viewBox="0 0 200 200">
      {/* Threshold guides */}
      <Line x1={pivotX} y1={pivotY} {...guide(enterDeg)} stroke={colors.border} strokeWidth={2} strokeDasharray="4 6" />
      <Line x1={pivotX} y1={pivotY} {...guide(-enterDeg)} stroke={colors.border} strokeWidth={2} strokeDasharray="4 6" />
      <Line x1={pivotX} y1={pivotY} x2={pivotX} y2={30} stroke={colors.mutedSoft} strokeWidth={2} />

      {/* Shoulders */}
      <Path d="M30 200 Q30 165 70 160 L130 160 Q170 165 170 200 Z" fill={colors.mutedSoft} />

      <G rotation={rotation} originX={pivotX} originY={pivotY}>
        <Rect x={88} y={120} width={24} height={36} rx={8} fill={colors.mutedSoft} />
        {/* Ears with AirPods */}
        <Circle cx={58} cy={90} r={9} fill="#F1D9C5" />
        <Circle cx={142} cy={90} r={9} fill="#F1D9C5" />
        <Rect x={52} y={92} width={6} height={14} rx={3} fill="#FFFFFF" stroke={colors.border} />
        <Rect x={142} y={92} width={6} height={14} rx={3} fill="#FFFFFF" stroke={colors.border} />
        <Circle cx={100} cy={85} r={42} fill="#F6E3D3" stroke={color} strokeWidth={4} />
        <Circle cx={86} cy={82} r={4} fill={colors.text} />
        <Circle cx={114} cy={82} r={4} fill={colors.text} />
        <Path d="M88 102 Q100 110 112 102" stroke={colors.text} strokeWidth={3} fill="none" strokeLinecap="round" />
      </G>
    </Svg>
  );
}
