import * as fs from 'fs';
import * as path from 'path';

const E2E_DATABASE_NAME = 'tabspot_test';

function loadDotEnvIfNeeded(): void {
  if (process.env['DATABASE_URL_TEST'] !== undefined) {
    return;
  }

  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = /^([^#\s=][^=]*)=(.*)$/.exec(line);
    if (match === null) {
      continue;
    }

    const key = match[1].trim();
    const value = match[2].trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function assertE2eDatabaseUrl(databaseUrl = process.env['DATABASE_URL']): void {
  if (process.env['NODE_ENV'] !== 'test') {
    throw new Error('E2E database cleanup is only allowed when NODE_ENV=test');
  }

  if (databaseUrl === undefined || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL_TEST must be set for E2E tests');
  }

  const parsedUrl = new URL(databaseUrl);
  const databaseName = parsedUrl.pathname.replace(/^\//, '');
  if (databaseName !== E2E_DATABASE_NAME) {
    throw new Error(`E2E tests must target ${E2E_DATABASE_NAME}, got ${databaseName}`);
  }
}

export function configureE2eEnvironment(): void {
  process.env['NODE_ENV'] = 'test';
  loadDotEnvIfNeeded();

  const testDatabaseUrl = process.env['DATABASE_URL_TEST'];
  assertE2eDatabaseUrl(testDatabaseUrl);
  process.env['DATABASE_URL'] = testDatabaseUrl;
}

configureE2eEnvironment();
