import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useSvgPalette } from './theme';

export type FeatureIconName = 'airpods' | 'balance' | 'chart';

/** SF Symbols–like glyphs for the welcome screen. */
export function FeatureIcon({ name }: { name: FeatureIconName }) {
  const { tint } = useSvgPalette();
  const stroke = { stroke: tint, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40">
      {name === 'airpods' && (
        <>
          <Circle cx={12} cy={13} r={6} fill={tint} />
          <Rect x={10} y={15} width={4} height={16} rx={2} fill={tint} />
          <Circle cx={28} cy={13} r={6} fill={tint} />
          <Rect x={26} y={15} width={4} height={16} rx={2} fill={tint} />
        </>
      )}
      {name === 'balance' && (
        <>
          <Path d="M20 6 L20 34" {...stroke} />
          <Path d="M8 14 L32 14" {...stroke} />
          <Path d="M4 24 L8 14 L12 24 Z" fill={tint} {...stroke} />
          <Path d="M28 24 L32 14 L36 24 Z" fill={tint} {...stroke} />
          <Path d="M13 34 L27 34" {...stroke} />
        </>
      )}
      {name === 'chart' && (
        <>
          <Rect x={6} y={20} width={7} height={14} rx={2} fill={tint} />
          <Rect x={16.5} y={10} width={7} height={24} rx={2} fill={tint} />
          <Rect x={27} y={15} width={7} height={19} rx={2} fill={tint} />
        </>
      )}
    </Svg>
  );
}
