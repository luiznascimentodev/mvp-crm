import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { cleanDatabase } from '../helpers/database-cleaner';
import { createTestApplication } from '../helpers/test-application.factory';
import { TEST_TENANT_ID, seedTestTenant } from '../helpers/test-data-seeder';

describe('Security: JWT Token Manipulation', () => {
  let application: NestFastifyApplication;
  let prisma: PrismaService;
  let validToken: string;
  let userId: string;

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
        email: 'user@jwt-sec.test',
        password: 'senha123456',
        name: 'JWT Test User',
        tenantId: TEST_TENANT_ID,
      },
    });

    const loginRes = await application.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'user@jwt-sec.test',
        password: 'senha123456',
        tenantId: TEST_TENANT_ID,
      },
    });
    const body = loginRes.json<{ access_token: string }>();
    validToken = body.access_token;

    const user = await prisma.user.findUniqueOrThrow({
      where: {
        tenantId_email: {
          tenantId: TEST_TENANT_ID,
          email: 'user@jwt-sec.test',
        },
      },
    });
    userId = user.id;
  });

  it('Token assinado com secret errado é rejeitado (401)', async () => {
    const forgedToken = jwt.sign(
      {
        sub: userId,
        email: 'user@jwt-sec.test',
        tenantId: TEST_TENANT_ID,
        role: 'OWNER',
      },
      'wrong-secret-that-is-at-least-32-characters-long',
    );

    const res = await application.inject({
      method: 'GET',
      url: '/auth/profile',
      headers: { authorization: `Bearer ${forgedToken}` },
    });

    expect(res.statusCode).toBe(401);
  });

  it('Token com payload role=OWNER mas assinatura inválida é rejeitado (401)', async () => {
    // Decodifica o token válido, altera o role e re-assina com chave errada
    const decoded = jwt.decode(validToken) as Record<string, unknown>;
    const forgedToken = jwt.sign(
      { ...decoded, role: 'OWNER' },
      'a-completely-wrong-secret-with-32-chars!!',
    );

    const res = await application.inject({
      method: 'GET',
      url: '/contacts',
      headers: { authorization: `Bearer ${forgedToken}` },
    });

    expect(res.statusCode).toBe(401);
  });

  it('Token expirado é rejeitado (401)', async () => {
    const secret =
      process.env.JWT_SECRET ?? 'test-secret-that-is-long-enough-32c';
    const expiredToken = jwt.sign(
      {
        sub: userId,
        email: 'user@jwt-sec.test',
        tenantId: TEST_TENANT_ID,
        role: 'MEMBER',
      },
      secret,
      { expiresIn: -1 }, // já expirado
    );

    const res = await application.inject({
      method: 'GET',
      url: '/auth/profile',
      headers: { authorization: `Bearer ${expiredToken}` },
    });

    expect(res.statusCode).toBe(401);
  });

  it('Token sem bearer prefix retorna 401', async () => {
    const res = await application.inject({
      method: 'GET',
      url: '/auth/profile',
      headers: { authorization: validToken }, // sem "Bearer "
    });

    expect(res.statusCode).toBe(401);
  });

  it('Token totalmente malformado retorna 401', async () => {
    const res = await application.inject({
      method: 'GET',
      url: '/contacts',
      headers: { authorization: 'Bearer not.a.valid.jwt.token.at.all' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('Token válido autentica corretamente (200)', async () => {
    const res = await application.inject({
      method: 'GET',
      url: '/auth/profile',
      headers: { authorization: `Bearer ${validToken}` },
    });

    expect(res.statusCode).toBe(200);
  });
});
