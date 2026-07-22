// @ts-check
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');

// NOTE: this uses typescript-eslint's recommended rules only — not
// `eslint-config-next`, whose latest release for Next 14 does not support
// ESLint 9 (peer dependency conflict, confirmed while setting this up: it
// requires eslint ^7 || ^8). That means Next-specific rules (e.g. rules of
// hooks, next/no-img-element) are NOT enforced yet. See SECURITY_CHECKLIST.md
// "Known gaps". This config still catches real bugs: unused variables,
// undefined references, unsafe patterns.
module.exports = tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'eslint.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-unused-vars': 'off',
    },
  },
);
