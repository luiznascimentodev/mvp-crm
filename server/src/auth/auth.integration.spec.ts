import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { cleanDatabase } from '../test/helpers/database-cleaner';
import { createTestApplication } from '../test/helpers/test-application.factory';
import {
  TEST_TENANT_ID,
  seedTestTenant,
} from '../test/helpers/test-data-seeder';

describe('AuthController (Integration)', () => {
  let application: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    application = await createTestApplication();
    prisma = application.get(PrismaService);
  });

  afterAll(async () => {
    await application.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestTenant(prisma); // ✅ Passar a instância do Prisma
  });

  describe('POST /auth/register', () => {
    it('should create user successfully with valid data', async () => {
      const response = await application.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'john@example.com',
          password: 'senha123456',
          name: 'John Doe',
          tenantId: TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(201);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('email', 'john@example.com');
      expect(body).toHaveProperty('name', 'John Doe');
      expect(body).toHaveProperty('role', 'MEMBER');
      expect(body).toHaveProperty('tenantId', TEST_TENANT_ID);
      expect(body).toHaveProperty('createdAt');
      expect(body).not.toHaveProperty('passwordHash');

      // Validar que usuário foi criado no banco
      const user = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: TEST_TENANT_ID,
            email: 'john@example.com',
          },
        },
      });

      expect(user).toBeDefined();
      expect(user?.name).toBe('John Doe');
      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe('senha123456'); // Password hashed
    });

    it('should return 409 when email already exists', async () => {
      // Criar usuário primeiro
      await application.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'senha123456',
          name: 'First User',
          tenantId: TEST_TENANT_ID,
        },
      });

      // Tentar criar novamente com mesmo email
      const response = await application.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'outrasenha123',
          name: 'Second User',
          tenantId: TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(409);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const body = response.json();
      expect(body).toHaveProperty('statusCode', 409);
      expect(body).toHaveProperty('message', 'Email already registered');
    });

    it('should return 400 when validation fails', async () => {
      const testCases = [
        {
          name: 'invalid email',
          payload: {
            email: 'invalid-email',
            password: 'senha123456',
            name: 'John Doe',
            tenantId: TEST_TENANT_ID,
          },
        },
        {
          name: 'password too short',
          payload: {
            email: 'valid@example.com',
            password: '123',
            name: 'John Doe',
            tenantId: TEST_TENANT_ID,
          },
        },
        {
          name: 'missing name',
          payload: {
            email: 'valid@example.com',
            password: 'senha123456',
            tenantId: TEST_TENANT_ID,
          },
        },
        {
          name: 'missing tenantId',
          payload: {
            email: 'valid@example.com',
            password: 'senha123456',
            name: 'John Doe',
          },
        },
      ];

      for (const testCase of testCases) {
        const response = await application.inject({
          method: 'POST',
          url: '/auth/register',
          payload: testCase.payload,
        });

        expect(response.statusCode).toBe(400);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const body = response.json();
        expect(body).toHaveProperty('statusCode', 400);
        expect(body).toHaveProperty('message');
      }
    });
  });
  describe('POST /auth/login', () => {
    const validPassword = 'senha123456';

    beforeEach(async () => {
      // Criar usuário para testes de login
      await application.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'logintest@example.com',
          password: validPassword,
          name: 'Login Test User',
          tenantId: TEST_TENANT_ID,
        },
      });
    });

    it('should return access_token for valid credentials', async () => {
      const response = await application.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'logintest@example.com',
          password: validPassword,
          tenantId: TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body: { access_token: string } = response.json();
      expect(body).toHaveProperty('access_token');
      expect(typeof body.access_token).toBe('string');
      expect(body.access_token.length).toBeGreaterThan(0);
    });

    it('should return 401 for invalid email', async () => {
      const response = await application.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: validPassword,
          tenantId: TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 for invalid password', async () => {
      const response = await application.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'logintest@example.com',
          password: 'wrongpassword',
          tenantId: TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
  describe('GET /auth/profile (Protected)', () => {
    const validPassword = 'senha123456';
    let accessToken: string;
    const userEmail = 'profiletest@example.com';

    beforeEach(async () => {
      // Registrar usuário
      await application.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: userEmail,
          password: validPassword,
          name: 'Profile Test User',
          tenantId: TEST_TENANT_ID,
        },
      });

      // Login para obter token
      const loginResponse = await application.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: userEmail,
          password: validPassword,
          tenantId: TEST_TENANT_ID,
        },
      });

      const body: { access_token: string } = loginResponse.json();
      accessToken = body.access_token;
    });

    it('should return 401 when no token is provided', async () => {
      const response = await application.inject({
        method: 'GET',
        url: '/auth/profile',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when invalid token is provided', async () => {
      const response = await application.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return user profile when valid token is provided', async () => {
      const response = await application.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        userId: string;
        email: string;
        tenantId: string;
        role: string;
      }>();
      expect(body).toHaveProperty('userId');
      expect(body).toHaveProperty('email', userEmail);
      expect(body).toHaveProperty('tenantId', TEST_TENANT_ID);
      expect(body).toHaveProperty('role', 'MEMBER');
    });
  });
});
