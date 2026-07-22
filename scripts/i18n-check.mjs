#!/usr/bin/env node
/**
 * CI guard: EN and HI catalogs must have identical key sets.
 * Fails (exit 1) if any key exists in one locale but not the other.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = join(root, 'packages', 'i18n', 'src', 'messages');

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = true;
  }
  return out;
}

const en = flatten(JSON.parse(readFileSync(join(base, 'en.json'), 'utf8')));
const hi = flatten(JSON.parse(readFileSync(join(base, 'hi.json'), 'utf8')));

const missingInHi = Object.keys(en).filter((k) => !(k in hi));
const missingInEn = Object.keys(hi).filter((k) => !(k in en));

if (missingInHi.length || missingInEn.length) {
  if (missingInHi.length) console.error('Missing in hi.json:\n  ' + missingInHi.join('\n  '));
  if (missingInEn.length) console.error('Missing in en.json:\n  ' + missingInEn.join('\n  '));
  process.exit(1);
}
console.log(`i18n OK — ${Object.keys(en).length} keys in both locales.`);
