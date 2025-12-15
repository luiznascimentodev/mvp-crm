import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApplication } from '../test/helpers/test-application.factory';
import { cleanDatabase } from '../test/helpers/database-cleaner';
import {
  TEST_TENANT_ID,
  seedTestTenant,
} from '../test/helpers/test-data-seeder';
import { PrismaService } from '../prisma/prisma.service';

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
    await seedTestTenant();
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
});
