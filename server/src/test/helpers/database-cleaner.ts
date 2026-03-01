import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function cleanDatabase(retries = 3): Promise<void> {
  // Uma única instrução atômica com CASCADE para cobrir todas as tabelas
  // dependentes (users, contacts, leads, deals, activities, audit_logs).
  // Retry garante resiliência contra deadlocks causados por writes
  // fire-and-forget (ex: AuditInterceptor) ainda em andamento.
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE "tenants" CASCADE;');
      return;
    } catch {
      if (attempt === retries - 1)
        throw new Error('cleanDatabase: max retries exceeded');
      await sleep(30 * (attempt + 1));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
