import { translate, type Locale } from '@rajyarank/i18n';

/** Client-side translator: always returns a string (fallback locale → key). */
export const makeT = (locale: Locale) => (key: string) => translate(locale, key);
