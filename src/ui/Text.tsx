import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';

import { usesSystemFont } from '../i18n';
import { font } from './fonts';
import { colors } from './theme';

const SYSTEM_WEIGHT: Record<string, TextStyle['fontWeight']> = {
  [font.light]: '300',
  [font.regular]: '400',
  [font.medium]: '500',
  [font.semibold]: '600',
};

/**
 * App text: Pretendard Regular in ink by default; styles passed in override it. Pretendard only
 * covers Hangul and Latin, so Chinese, Japanese, Russian and Hindi switch to the system font at the
 * same weight.
 */
export function Text({ style, ...props }: TextProps) {
  if (usesSystemFont()) {
    const flat = StyleSheet.flatten([{ fontFamily: font.regular }, style]);
    const weight = SYSTEM_WEIGHT[flat.fontFamily ?? ''];
    return (
      <RNText
        {...props}
        style={[
          { color: colors.text },
          flat,
          { fontFamily: undefined, fontWeight: weight ?? flat.fontWeight, letterSpacing: 0 },
        ]}
      />
    );
  }
  return <RNText {...props} style={[{ fontFamily: font.regular, color: colors.text }, style]} />;
}
