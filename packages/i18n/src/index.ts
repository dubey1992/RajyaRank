import en from './messages/en.json' with { type: 'json' };
import hi from './messages/hi.json' with { type: 'json' };

export const LOCALES = ['hi', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'hi';

export const messages: Record<Locale, Record<string, unknown>> = { en, hi };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Resolve a dotted key against a locale with fallback: locale → hi → key. */
export function translate(locale: Locale, key: string): string {
  return lookup(messages[locale], key) ?? lookup(messages.hi, key) ?? key;
}

function lookup(bundle: Record<string, unknown>, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, bundle);
  return typeof value === 'string' ? value : undefined;
}
