import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { PostureState } from '../engine';
import { colors } from './theme';

type Props = {
  /** Signed tilt in degrees, positive = user's right. */
  angle: number;
  state: PostureState;
  size?: number;
};

/**
 * Flat-illustration character (bust) whose head and neck tilt with the measured angle.
 * Drawn like a mirror: tilting to your right tilts the character towards the right of the screen.
 */
export function PersonVisual({ angle, state, size = 220 }: Props) {
  const rotation = Math.max(-35, Math.min(35, angle));
  // Alert cue plays in the ear opposite the tilt; in the mirrored drawing that is the same screen side.
  const cueSide = state === 'alerted' ? (angle < 0 ? 1 : -1) : 0;

  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      {/* Torso: coral sweater with navy stripes */}
      <Path d="M40 240 C40 196 62 172 100 166 L140 166 C178 172 200 196 200 240 Z" fill={colors.primary} />
      <Path d="M48 212 L192 212" stroke={colors.navy} strokeWidth={7} strokeLinecap="round" opacity={0.9} />
      <Path d="M44 228 L196 228" stroke={colors.navy} strokeWidth={7} strokeLinecap="round" opacity={0.9} />
      <Path d="M104 166 Q120 182 136 166" fill={colors.primarySoft} />

      <G rotation={rotation} originX={120} originY={172}>
        {/* Neck */}
        <Rect x={110} y={128} width={20} height={46} rx={9} fill={colors.skin} />
        <G translateY={8}>
        {/* Ears */}
        <Ellipse cx={93} cy={96} rx={7} ry={9} fill={colors.skin} />
        <Ellipse cx={147} cy={96} rx={7} ry={9} fill={colors.skin} />
        {/* Head */}
        <Ellipse cx={120} cy={92} rx={27} ry={31} fill={colors.skin} />
        {/* Hair with a bun */}
        <Circle cx={120} cy={50} r={13} fill={colors.navy} />
        <Path d="M92 92 C90 64 104 58 120 58 C138 58 152 66 148 92 C142 78 128 72 114 74 C104 76 96 82 92 92 Z" fill={colors.navy} />
        {/* AirPods */}
        <Rect x={86} y={94} width={7} height={18} rx={3.5} fill="#FFFFFF" stroke={colors.border} strokeWidth={1} />
        <Rect x={147} y={94} width={7} height={18} rx={3.5} fill="#FFFFFF" stroke={colors.border} strokeWidth={1} />
        <Face state={state} />
        {/* Sound cue waves next to one ear */}
        {cueSide !== 0 && (
          <G>
            <Path
              d={cueSide > 0 ? 'M160 88 Q168 98 160 108' : 'M80 88 Q72 98 80 108'}
              stroke={colors.danger}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={cueSide > 0 ? 'M168 80 Q182 98 168 116' : 'M72 80 Q58 98 72 116'}
              stroke={colors.danger}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              opacity={0.6}
            />
          </G>
        )}
        </G>
      </G>
    </Svg>
  );
}

function Face({ state }: { state: PostureState }) {
  const ink = colors.navy;
  if (state === 'paused') {
    return (
      <G>
        <Path d="M106 96 Q110 99 114 96" stroke={ink} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Path d="M126 96 Q130 99 134 96" stroke={ink} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Path d="M114 110 L126 110" stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
      </G>
    );
  }
  const mouth = {
    good: 'M110 107 Q120 116 130 107',
    tilting: 'M112 110 L128 110',
    alerted: 'M111 113 Q120 105 129 113',
  }[state];
  return (
    <G>
      <Circle cx={110} cy={95} r={3.2} fill={ink} />
      <Circle cx={130} cy={95} r={3.2} fill={ink} />
      {state === 'good' && (
        <>
          <Circle cx={103} cy={104} r={4} fill={colors.primary} opacity={0.35} />
          <Circle cx={137} cy={104} r={4} fill={colors.primary} opacity={0.35} />
        </>
      )}
      <Path d={mouth} stroke={ink} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </G>
  );
}
