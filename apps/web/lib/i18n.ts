import { messages, translate, isLocale, DEFAULT_LOCALE, type Locale } from '@rajyarank/i18n';

export { messages, isLocale, DEFAULT_LOCALE };
export type { Locale };

export function resolveLocale(raw: string | undefined): Locale {
  return raw && isLocale(raw) ? raw : DEFAULT_LOCALE;
}

/** Server-side translator bound to a locale. */
export function getT(locale: Locale) {
  return (key: string) => translate(locale, key);
}
