import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://jackaroo@localhost:5433/jackaroo_test?schema=public';

export default async function globalSetup(): Promise<void> {
  if (!TEST_DATABASE_URL.includes('_test')) {
    throw new Error('Refusing to run API tests against a non-test database.');
  }
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  const testUrl = new URL(TEST_DATABASE_URL);
  const databaseName = decodeURIComponent(testUrl.pathname.replace(/^\//, ''));
  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = '/postgres';
  adminUrl.search = '';

  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('already exists')) {
      // The database may already exist; prisma db push will surface real failures.
      console.warn(`Could not create test database (continuing): ${message.split('\n')[0]}`);
    }
  } finally {
    await admin.$disconnect();
  }

  const apiRoot = path.resolve(__dirname, '..');
  execFileSync('pnpm', ['exec', 'prisma', 'db', 'push', '--force-reset', '--skip-generate'], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
