import base from '@jackaroo/eslint-config';

const eslintConfig = [
  ...base,
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'android/**', 'ios/**', 'babel.config.js', 'metro.config.js'],
  },
  {
    rules: {
      // React Native style conventions.
      'react-native/no-unused-styles': 'off',
      'no-console': 'off',
    },
  },
];

export default eslintConfig;
