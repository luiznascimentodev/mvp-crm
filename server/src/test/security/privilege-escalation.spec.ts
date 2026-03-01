import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { cleanDatabase } from '../helpers/database-cleaner';
import { createTestApplication } from '../helpers/test-application.factory';
import { TEST_TENANT_ID, seedTestTenant } from '../helpers/test-data-seeder';

const FAKE_INVITE_ID = '00000000-0000-0000-0000-000000000099';

describe('Security: Privilege Escalation', () => {
  let application: NestFastifyApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let memberToken: string;

  beforeAll(async () => {
    application = await createTestApplication();
    prisma = application.get(PrismaService);
  });

  afterAll(async () => {
    await application.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestTenant(prisma);

    // Registrar OWNER
    await application.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantId: TEST_TENANT_ID,
        email: 'owner@priv-esc.test',
        password: 'Senha123!',
        name: 'Owner Priv',
      },
    });
    await prisma.user.update({
      where: {
        tenantId_email: {
          tenantId: TEST_TENANT_ID,
          email: 'owner@priv-esc.test',
        },
      },
      data: { role: Role.OWNER },
    });
    const ownerLogin = await application.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'owner@priv-esc.test',
        password: 'Senha123!',
        tenantId: TEST_TENANT_ID,
      },
    });
    ownerToken = ownerLogin.json<{ access_token: string }>().access_token;

    // Registrar MEMBER
    await application.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantId: TEST_TENANT_ID,
        email: 'member@priv-esc.test',
        password: 'Senha123!',
        name: 'Member Priv',
      },
    });
    await prisma.user.update({
      where: {
        tenantId_email: {
          tenantId: TEST_TENANT_ID,
          email: 'member@priv-esc.test',
        },
      },
      data: { role: Role.MEMBER },
    });
    const memberLogin = await application.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'member@priv-esc.test',
        password: 'Senha123!',
        tenantId: TEST_TENANT_ID,
      },
    });
    memberToken = memberLogin.json<{ access_token: string }>().access_token;

    void ownerToken; // usado em testes futuros se necessário
  });

  it('MEMBER não pode convidar membros (403)', async () => {
    const res = await application.inject({
      method: 'POST',
      url: '/team/invite',
      headers: { authorization: `Bearer ${memberToken}` },
      payload: { email: 'novo@example.com', role: 'MEMBER' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('MEMBER não pode listar convites pendentes (403)', async () => {
    const res = await application.inject({
      method: 'GET',
      url: '/team/invites',
      headers: { authorization: `Bearer ${memberToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('MEMBER não pode revogar convites (403)', async () => {
    // O RolesGuard rejeita antes de consultar o banco → UUID fictício é suficiente
    const res = await application.inject({
      method: 'DELETE',
      url: `/team/invites/${FAKE_INVITE_ID}`,
      headers: { authorization: `Bearer ${memberToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('Usuário sem token não acessa rotas protegidas (401)', async () => {
    const res = await application.inject({
      method: 'GET',
      url: '/team/members',
    });

    expect(res.statusCode).toBe(401);
  });
});
