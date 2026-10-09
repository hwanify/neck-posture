import { type ReactNode, useId } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Rounded surface filled with a soft linear gradient. */
export function GradientCard({
  colors,
  vertical,
  style,
  children,
}: {
  /** Two or more stops, spread evenly. */
  colors: string[];
  /** Top-to-bottom instead of diagonal. */
  vertical?: boolean;
  style?: ViewStyle;
  children?: ReactNode;
}) {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[styles.card, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2={vertical ? '0' : '1'} y2="1">
            {colors.map((c, i) => (
              <Stop key={i} offset={String(i / (colors.length - 1))} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, overflow: 'hidden' },
});
