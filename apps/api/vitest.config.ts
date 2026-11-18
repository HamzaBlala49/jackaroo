import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://jackaroo@localhost:5433/jackaroo_test?schema=public';

export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2021',
      },
      module: { type: 'es6' },
    }),
  ],
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    globals: false,
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 180_000,
    hookTimeout: 120_000,
    globalSetup: ['./test/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'jackaroo-test-secret-that-is-long-enough-1234567890',
      JWT_EXPIRES_DAYS: '30',
      COOKIE_SECURE: 'false',
      WEB_ORIGIN: 'http://localhost:3000',
      REDIS_URL: '',
      API_PORT: '4001',
    },
  },
});
