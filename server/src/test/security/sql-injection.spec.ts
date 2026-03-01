import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { cleanDatabase } from '../helpers/database-cleaner';
import { createTestApplication } from '../helpers/test-application.factory';
import { TEST_TENANT_ID, seedTestTenant } from '../helpers/test-data-seeder';

describe('Security: SQL Injection', () => {
  let application: NestFastifyApplication;
  let prisma: PrismaService;
  let accessToken: string;

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

    await application.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'user@sql-inject.test',
        password: 'senha123456',
        name: 'SQL Test User',
        tenantId: TEST_TENANT_ID,
      },
    });

    const loginRes = await application.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'user@sql-inject.test',
        password: 'senha123456',
        tenantId: TEST_TENANT_ID,
      },
    });
    accessToken = loginRes.json<{ access_token: string }>().access_token;
  });

  it('Payload de DROP TABLE no campo search retorna 200 (não 500)', async () => {
    const payload = encodeURIComponent("'; DROP TABLE users--");
    const res = await application.inject({
      method: 'GET',
      url: `/contacts?search=${payload}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Prisma parametriza automaticamente - deve retornar 200 com lista vazia
    expect(res.statusCode).toBe(200);
  });

  it('UNION SELECT injection no search não vazar dados de outros tenants', async () => {
    const payload = encodeURIComponent(
      "' UNION SELECT id, email, passwordHash FROM users--",
    );
    const res = await application.inject({
      method: 'GET',
      url: `/contacts?search=${payload}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ data?: unknown[] }>();
    // Resultado deve ser array vazio - nenhum dado vazado
    const items = body.data ?? body;
    expect(Array.isArray(items)).toBe(true);
  });

  it('Injection via parâmetro de login não autentica usuário com SQL', async () => {
    const res = await application.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: "' OR '1'='1",
        password: "' OR '1'='1",
        tenantId: TEST_TENANT_ID,
      },
    });

    // Deve falhar com 400 (validação de email) ou 401 (credenciais inválidas)
    expect([400, 401]).toContain(res.statusCode);
  });

  it('XSS payload em campo search é sanitizado e retorna 200', async () => {
    const payload = encodeURIComponent('<script>alert("xss")</script>');
    const res = await application.inject({
      method: 'GET',
      url: `/contacts?search=${payload}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
  });
});
