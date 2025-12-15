import { PrismaClient } from '@prisma/client';

export const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export async function seedTestTenant(prisma: PrismaClient) {
  await prisma.tenant.upsert({
    where: { id: TEST_TENANT_ID },
    update: {},
    create: {
      id: TEST_TENANT_ID,
      name: 'Test Tenant',
      slug: 'test-tenant',
    },
  });
}
