import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function cleanDatabase(retries = 5): Promise<void> {
  // Uma única instrução atômica com CASCADE para cobrir todas as tabelas
  // dependentes (users, contacts, leads, activities, audit_logs).
  // Retry garante resiliência contra deadlocks causados por writes
  // fire-and-forget (ex: AuditInterceptor) ainda em andamento.
  // Aguardamos 100ms antes do primeiro TRUNCATE para deixar writes em voo terminarem.
  await sleep(100);
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE "tenants" CASCADE;');
      return;
    } catch {
      if (attempt === retries - 1)
        throw new Error('cleanDatabase: max retries exceeded');
      await sleep(100 * (attempt + 1));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
