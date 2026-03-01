import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { cleanDatabase } from '../helpers/database-cleaner';
import { createTestApplication } from '../helpers/test-application.factory';
import { TEST_TENANT_ID, seedTestTenant } from '../helpers/test-data-seeder';

const TENANT_B_ID = '00000000-0000-0000-0000-000000000002';

describe('Security: Multi-tenancy Isolation', () => {
  let application: NestFastifyApplication;
  let prisma: PrismaService;

  let tokenTenantA: string;
  let tokenTenantB: string;
  let contactIdTenantA: string;
  let leadIdTenantA: string;

  beforeAll(async () => {
    application = await createTestApplication();
    prisma = application.get(PrismaService);
  });

  afterAll(async () => {
    await application.close();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // ── Tenant A ──────────────────────────────────────────────────────────
    await seedTestTenant(prisma); // cria o TEST_TENANT_ID

    await application.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantId: TEST_TENANT_ID,
        email: 'user-a@mt.test',
        password: 'Senha123!',
        name: 'User Tenant A',
      },
    });
    await prisma.user.update({
      where: {
        tenantId_email: { tenantId: TEST_TENANT_ID, email: 'user-a@mt.test' },
      },
      data: { role: Role.OWNER },
    });
    const loginA = await application.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'user-a@mt.test',
        password: 'Senha123!',
        tenantId: TEST_TENANT_ID,
      },
    });
    tokenTenantA = loginA.json<{ access_token: string }>().access_token;

    // Criar contato para Tenant A
    const contactRes = await application.inject({
      method: 'POST',
      url: '/contacts',
      headers: { authorization: `Bearer ${tokenTenantA}` },
      payload: {
        name: 'Contato Privado Tenant A',
        email: 'private-contact@tenant-a.com',
      },
    });
    contactIdTenantA = contactRes.json<{ id: string }>().id;

    // Criar lead para Tenant A
    const leadRes = await application.inject({
      method: 'POST',
      url: '/leads',
      headers: { authorization: `Bearer ${tokenTenantA}` },
      payload: {
        name: 'Lead Privado Tenant A',
        email: 'private-lead@tenant-a.com',
      },
    });
    leadIdTenantA = leadRes.json<{ id: string }>().id;

    // ── Tenant B ──────────────────────────────────────────────────────────
    await prisma.tenant.upsert({
      where: { id: TENANT_B_ID },
      update: {},
      create: {
        id: TENANT_B_ID,
        name: 'Tenant B',
        slug: 'tenant-b',
      },
    });

    await application.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantId: TENANT_B_ID,
        email: 'user-b@mt.test',
        password: 'Senha123!',
        name: 'User Tenant B',
      },
    });
    await prisma.user.update({
      where: {
        tenantId_email: { tenantId: TENANT_B_ID, email: 'user-b@mt.test' },
      },
      data: { role: Role.OWNER },
    });
    const loginB = await application.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'user-b@mt.test',
        password: 'Senha123!',
        tenantId: TENANT_B_ID,
      },
    });
    tokenTenantB = loginB.json<{ access_token: string }>().access_token;
  });

  it('Usuário Tenant B não acessa contato do Tenant A (404)', async () => {
    const res = await application.inject({
      method: 'GET',
      url: `/contacts/${contactIdTenantA}`,
      headers: { authorization: `Bearer ${tokenTenantB}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('Listagem de contatos do Tenant B não inclui dados do Tenant A', async () => {
    const res = await application.inject({
      method: 'GET',
      url: '/contacts',
      headers: { authorization: `Bearer ${tokenTenantB}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: Array<{ id: string }> }>();
    const ids = body.data.map((c) => c.id);
    expect(ids).not.toContain(contactIdTenantA);
  });

  it('Usuário Tenant B não acessa lead do Tenant A (404)', async () => {
    const res = await application.inject({
      method: 'GET',
      url: `/leads/${leadIdTenantA}`,
      headers: { authorization: `Bearer ${tokenTenantB}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('Tenant B não pode deletar contato do Tenant A (404)', async () => {
    const res = await application.inject({
      method: 'DELETE',
      url: `/contacts/${contactIdTenantA}`,
      headers: { authorization: `Bearer ${tokenTenantB}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('Dashboard do Tenant B não retorna métricas do Tenant A', async () => {
    const [resA, resB] = await Promise.all([
      application.inject({
        method: 'GET',
        url: '/dashboard/metrics',
        headers: { authorization: `Bearer ${tokenTenantA}` },
      }),
      application.inject({
        method: 'GET',
        url: '/dashboard/metrics',
        headers: { authorization: `Bearer ${tokenTenantB}` },
      }),
    ]);

    const metricsA = resA.json<{ totalLeads: number; totalContacts: number }>();
    const metricsB = resB.json<{ totalLeads: number; totalContacts: number }>();

    expect(metricsA.totalLeads).toBe(1);
    expect(metricsA.totalContacts).toBe(1);
    expect(metricsB.totalLeads).toBe(0);
    expect(metricsB.totalContacts).toBe(0);
  });
});
