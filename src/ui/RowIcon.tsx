import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from './theme';

export type RowIconName =
  | 'angle'
  | 'timer'
  | 'repeat'
  | 'speaker'
  | 'chime'
  | 'haptic'
  | 'bell'
  | 'volume'
  | 'moon'
  | 'sun'
  | 'sensor'
  | 'ear'
  | 'info';

/** Small glyph on a rounded tile, like the leading icons in iOS Settings. */
export function RowIcon({ name }: { name: RowIconName }) {
  const c = colors.tint;
  const s = { stroke: c, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={18} height={18} viewBox="0 0 18 18">
        {name === 'angle' && (
          <>
            <Path d="M3 15 L15 15" {...s} />
            <Path d="M3 15 L13 5" {...s} />
            <Path d="M8 15 A5 5 0 0 0 6.5 11.5" {...s} />
          </>
        )}
        {name === 'timer' && (
          <>
            <Circle cx={9} cy={10} r={6} {...s} />
            <Path d="M9 10 L9 7 M7 2 L11 2" {...s} />
          </>
        )}
        {name === 'repeat' && (
          <>
            <Path d="M3 8 A5 5 0 0 1 13 6 L15 6 M15 3 L15 6 L12 6" {...s} />
            <Path d="M15 10 A5 5 0 0 1 5 12 L3 12 M3 15 L3 12 L6 12" {...s} />
          </>
        )}
        {name === 'speaker' && (
          <>
            <Path d="M3 7 L6 7 L10 4 L10 14 L6 11 L3 11 Z" {...s} />
            <Path d="M12.5 6.5 A3.5 3.5 0 0 1 12.5 11.5" {...s} />
          </>
        )}
        {name === 'chime' && <Path d="M4 13 L4 5 L14 3 L14 11 M4 13 A2 2 0 1 1 4 12.9 M14 11 A2 2 0 1 1 14 10.9" {...s} />}
        {name === 'haptic' && (
          <>
            <Rect x={6} y={3} width={6} height={12} rx={1.5} {...s} />
            <Path d="M3 7 L3 11 M15 7 L15 11" {...s} />
          </>
        )}
        {name === 'bell' && <Path d="M5 12 L5 8 A4 4 0 0 1 13 8 L13 12 L14.5 13.5 L3.5 13.5 Z M7.5 15.5 L10.5 15.5" {...s} />}
        {name === 'volume' && (
          <>
            <Path d="M3 14 L15 4 L15 14 Z" {...s} />
          </>
        )}
        {name === 'moon' && <Path d="M13.5 11 A6 6 0 1 1 7 3.5 A4.5 4.5 0 0 0 13.5 11 Z" {...s} />}
        {name === 'sun' && (
          <>
            <Circle cx={9} cy={9} r={3} {...s} />
            <Path d="M9 2 L9 3.5 M9 14.5 L9 16 M2 9 L3.5 9 M14.5 9 L16 9 M4 4 L5 5 M13 13 L14 14 M4 14 L5 13 M13 5 L14 4" {...s} />
          </>
        )}
        {name === 'sensor' && (
          <>
            <Circle cx={6} cy={6} r={2.5} {...s} />
            <Path d="M6 8.5 L6 15" {...s} />
            <Circle cx={12} cy={6} r={2.5} {...s} />
            <Path d="M12 8.5 L12 15" {...s} />
          </>
        )}
        {name === 'ear' && <Path d="M5 7 A4 4 0 0 1 13 7 C13 10 10 10.5 10 13 A2 2 0 0 1 6 13.5" {...s} />}
        {name === 'info' && (
          <>
            <Circle cx={9} cy={9} r={6.5} {...s} />
            <Path d="M9 8 L9 12.5 M9 5.5 L9 5.6" {...s} />
          </>
        )}
      </Svg>
    </View>
  );
}
