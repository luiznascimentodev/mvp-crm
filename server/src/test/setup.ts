import { beforeEach, afterAll } from 'vitest';
import { cleanDatabase, disconnectDatabase } from './helpers/database-cleaner';
import { seedTestTenant } from './helpers/test-data-seeder';

beforeEach(async () => {
  await cleanDatabase();
  await seedTestTenant();
});

afterAll(async () => {
  await disconnectDatabase();
});
