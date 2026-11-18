import base from '@jackaroo/eslint-config';

const eslintConfig = [
  ...base,
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'prisma/**'],
  },
  {
    rules: {
      // Nest's bootstrap logs fatal startup errors through the console.
      'no-console': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
];

export default eslintConfig;
