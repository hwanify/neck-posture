import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from './theme';

export type TabIconName = 'home' | 'history' | 'settings';

/** SF Symbols–like tab icons: outlined when inactive, filled when selected. */
export function TabIcon({ name, color, active }: { name: TabIconName; color: string; active: boolean }) {
  const stroke = { stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={28} height={26} viewBox="0 0 28 26">
      {name === 'home' && (
        <>
          {/* gauge.with.needle */}
          <Circle cx={14} cy={13} r={10.5} fill={active ? color : 'none'} {...stroke} />
          <Path d="M14 13 L18.5 8" stroke={active ? colors.bg : color} strokeWidth={2} strokeLinecap="round" />
          <Circle cx={14} cy={13} r={1.6} fill={active ? colors.bg : color} />
        </>
      )}
      {name === 'history' && (
        <>
          {/* chart.bar */}
          <Rect x={5} y={13} width={4.5} height={9} rx={1.2} fill={active ? color : 'none'} {...stroke} />
          <Rect x={11.75} y={5} width={4.5} height={17} rx={1.2} fill={active ? color : 'none'} {...stroke} />
          <Rect x={18.5} y={9.5} width={4.5} height={12.5} rx={1.2} fill={active ? color : 'none'} {...stroke} />
        </>
      )}
      {name === 'settings' && (
        <>
          {/* gearshape */}
          <Path
            d="M14 3.5 L16 3.9 L16.6 6.4 L18.7 7.6 L21.1 6.8 L22.5 8.4 L21.6 10.8 L22.3 13 L24.5 14.2 L24.2 16.3 L21.8 17 L20.6 19.1 L21.3 21.6 L19.6 22.9 L17.3 21.8 L15 22.4 L14 24.5 L12 24.5 L11 22.4 L8.7 21.8 L6.4 22.9 L4.7 21.6 L5.4 19.1 L4.2 17 L1.8 16.3 L1.5 14.2 L3.7 13 L4.4 10.8 L3.5 8.4 L4.9 6.8 L7.3 7.6 L9.4 6.4 L10 3.9 L12 3.5 Z"
            transform="translate(0 -1)"
            fill={active ? color : 'none'}
            {...stroke}
          />
          <Circle cx={13} cy={13} r={3.6} fill={active ? colors.bg : 'none'} stroke={active ? colors.bg : color} strokeWidth={1.7} />
        </>
      )}
    </Svg>
  );
}
