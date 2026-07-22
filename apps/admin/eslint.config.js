// @ts-check
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');

// See apps/web/eslint.config.js for why this doesn't use eslint-config-next.
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
