import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { seedTestTenant } from './helpers/test-data-seeder';

const prisma = new PrismaClient();

beforeAll(async () => {
  await seedTestTenant(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});
