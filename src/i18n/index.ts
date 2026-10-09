import { getLocales } from 'expo-localization';

import { de } from './strings/de';
import { en, type StringKey, type Strings } from './strings/en';
import { es } from './strings/es';
import { fr } from './strings/fr';
import { hi } from './strings/hi';
import { ja } from './strings/ja';
import { ko } from './strings/ko';
import { pt } from './strings/pt';
import { ru } from './strings/ru';
import { zhHans } from './strings/zhHans';

export type { StringKey };

/** Supported languages, each listed by its own name (as iOS does in language pickers). */
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' },
  { code: 'zh-Hans', name: '简体中文' },
  { code: 'ja', name: '日本語' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'hi', name: 'हिन्दी' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];
/** What the user picked in Settings; 'system' follows the iPhone's language. */
export type LanguageSetting = 'system' | Language;

const DICTIONARIES: Record<Language, Strings> = {
  en,
  ko,
  'zh-Hans': zhHans,
  ja,
  es,
  fr,
  de,
  pt,
  ru,
  hi,
};

/** Scripts the bundled Pretendard subset doesn't cover; these use the system font. */
const SYSTEM_FONT_LANGUAGES: ReadonlySet<Language> = new Set(['zh-Hans', 'ja', 'ru', 'hi']);

/** First of the iPhone's preferred languages that we support, else English. */
export function systemLanguage(): Language {
  let locales: { languageCode: string | null }[] = [];
  try {
    locales = getLocales();
  } catch {
    // Native module missing (older build): fall through to English.
  }
  for (const locale of locales) {
    const code = locale.languageCode?.toLowerCase();
    if (code === 'zh') return 'zh-Hans';
    const match = LANGUAGES.find((l) => l.code === code);
    if (match) return match.code;
  }
  return 'en';
}

let current: Language = systemLanguage();

export function setLanguage(setting: LanguageSetting): void {
  current = setting === 'system' ? systemLanguage() : setting;
}

export function getLanguage(): Language {
  return current;
}

export function languageName(code: Language): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export function usesSystemFont(): boolean {
  return SYSTEM_FONT_LANGUAGES.has(current);
}

/** Translated string for the current language, with `{name}` placeholders filled from `params`. */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  const template = DICTIONARIES[current][key] ?? en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** BCP 47 tag for Intl date formatting. */
export function localeTag(): string {
  return current;
}
