import Svg, { Circle, Line } from 'react-native-svg';

export type TabIconName = 'home' | 'history' | 'settings';

/** Thin line icons for the tab bar. */
export function TabIcon({ name, color }: { name: TabIconName; color: string }) {
  const common = { stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {name === 'home' && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...common} />
          <Line x1={12} y1={3.5} x2={12} y2={6} {...common} />
          <Line x1={12} y1={12} x2={15} y2={7.5} {...common} />
        </>
      )}
      {name === 'history' && (
        <>
          <Line x1={6} y1={19} x2={6} y2={12} {...common} />
          <Line x1={12} y1={19} x2={12} y2={6} {...common} />
          <Line x1={18} y1={19} x2={18} y2={10} {...common} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Line x1={4} y1={7} x2={20} y2={7} {...common} />
          <Line x1={4} y1={17} x2={20} y2={17} {...common} />
          <Circle cx={9} cy={7} r={2.2} {...common} fill="#0A0A0B" />
          <Circle cx={15} cy={17} r={2.2} {...common} fill="#0A0A0B" />
        </>
      )}
    </Svg>
  );
}
