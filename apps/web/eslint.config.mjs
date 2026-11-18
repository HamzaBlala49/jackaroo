import { globalIgnores } from 'eslint/config';
import base from '@jackaroo/eslint-config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...base,
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    'e2e-results/**',
  ]),
  {
    rules: {
      // The board SVG intentionally renders hundreds of static decorative nodes.
      'react/no-array-index-key': 'off',
    },
  },
];

export default eslintConfig;
