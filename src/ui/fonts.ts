import { useFonts } from 'expo-font';

/** Pretendard (SIL OFL 1.1), subset to KS X 1001 Hangul + Latin. Use these instead of fontWeight. */
export const font = {
  light: 'Pretendard-Light',
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
} as const;

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    [font.light]: require('../../assets/fonts/Pretendard-Light.otf'),
    [font.regular]: require('../../assets/fonts/Pretendard-Regular.otf'),
    [font.medium]: require('../../assets/fonts/Pretendard-Medium.otf'),
    [font.semibold]: require('../../assets/fonts/Pretendard-SemiBold.otf'),
  });
  // Fall back to the system font rather than blocking the app if loading fails.
  return loaded || error !== null;
}

/**
 * Type scale. Large numerals are light and tightly tracked; labels are small and medium;
 * semibold is reserved for titles and buttons.
 */
export const type = {
  display: { fontFamily: font.light, fontSize: 104, letterSpacing: -5 },
  title: { fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.8 },
  heading: { fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.5 },
  numeral: { fontFamily: font.light, fontSize: 30, letterSpacing: -1 },
  body: { fontFamily: font.regular, fontSize: 16, letterSpacing: -0.3 },
  bodyStrong: { fontFamily: font.medium, fontSize: 16, letterSpacing: -0.3 },
  callout: { fontFamily: font.medium, fontSize: 15, letterSpacing: -0.2 },
  caption: { fontFamily: font.regular, fontSize: 13, letterSpacing: -0.1 },
  label: { fontFamily: font.medium, fontSize: 12, letterSpacing: 0.1 },
  button: { fontFamily: font.semibold, fontSize: 16, letterSpacing: -0.2 },
} as const;
