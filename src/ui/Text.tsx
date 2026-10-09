import { Text as RNText, type TextProps } from 'react-native';

import { font } from './fonts';
import { colors } from './theme';

/** App text: Pretendard Regular in ink by default; styles passed in override it. */
export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[{ fontFamily: font.regular, color: colors.text }, style]} />;
}
