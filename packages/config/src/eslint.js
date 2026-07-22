// Shared flat ESLint config for RajyaRank TypeScript packages/apps.
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Guardrail: forbid stringly-typed role checks in app code.
      // Authorization must go through the central policy engine (@rajyarank/auth),
      // never `if (role === 'TEACHER')` style checks.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "BinaryExpression[operator=/===|!==/] > MemberExpression[property.name=/^role$|^roleKey$/]",
          message:
            'Do not compare role names directly. Use the central authorization policy engine (@rajyarank/auth).',
        },
      ],
    },
  },
  { ignores: ['dist/**', '.next/**', 'coverage/**', 'node_modules/**'] },
];
