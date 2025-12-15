import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function cleanDatabase(): Promise<void> {
  // ✅ TRUNCATE reseta sequences e constraints
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "tenants" CASCADE;');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
