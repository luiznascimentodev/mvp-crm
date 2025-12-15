import { prisma } from './database-cleaner';

export const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

export async function seedTestTenant(): Promise<void> {
  // ✅ Usar mesma instância do Prisma
  const existingTenant = await prisma.tenant.findUnique({
    where: { id: TEST_TENANT_ID },
  });

  if (existingTenant) {
    return; // Já existe, não precisa criar
  }

  // Criar apenas se não existir
  await prisma.tenant.create({
    data: {
      id: TEST_TENANT_ID,
      name: 'Test Company',
      slug: 'test-company',
    },
  });
}
