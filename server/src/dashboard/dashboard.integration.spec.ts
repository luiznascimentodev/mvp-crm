import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { cleanDatabase } from '../test/helpers/database-cleaner';
import { createTestApplication } from '../test/helpers/test-application.factory';
import {
  TEST_TENANT_ID,
  seedTestTenant,
} from '../test/helpers/test-data-seeder';

interface Metrics {
  totalContacts: number;
  totalDeals: number;
  activeDeals: number;
  pipelineValue: number;
  conversionRate: number;
  dealsByStage: unknown[];
}

interface FunnelItem {
  stage: string;
  count: number;
  value: number;
}

describe('DashboardController (Integration)', () => {
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
        email: 'owner@dashboard.test',
        password: 'senha123456',
        name: 'Dashboard Owner',
        tenantId: TEST_TENANT_ID,
      },
    });

    const loginRes = await application.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'owner@dashboard.test',
        password: 'senha123456',
        tenantId: TEST_TENANT_ID,
      },
    });
    const loginBody = loginRes.json<{ access_token: string }>();
    accessToken = loginBody.access_token;
  });

  describe('GET /dashboard/metrics', () => {
    it('should return metrics with auth', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/dashboard/metrics',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<Metrics>();
      expect(body).toHaveProperty('totalContacts');
      expect(body).toHaveProperty('totalDeals');
      expect(body).toHaveProperty('activeDeals');
      expect(body).toHaveProperty('pipelineValue');
      expect(body).toHaveProperty('conversionRate');
      expect(body).toHaveProperty('dealsByStage');
      expect(Array.isArray(body.dealsByStage)).toBe(true);
    });

    it('should return 401 without token', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/dashboard/metrics',
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return empty metrics for fresh tenant', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/dashboard/metrics',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<Metrics>();
      expect(body.totalContacts).toBe(0);
      expect(body.totalDeals).toBe(0);
      expect(body.conversionRate).toBe(0);
    });
  });

  describe('GET /dashboard/deals-over-time', () => {
    it('should return array of daily deal stats', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/dashboard/deals-over-time?days=7',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<unknown[]>();
      expect(Array.isArray(body)).toBe(true);
    });

    it('should default to 30 days when no param', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/dashboard/deals-over-time',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /dashboard/top-performers', () => {
    it('should return array of performers', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/dashboard/top-performers',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<unknown[]>();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('GET /dashboard/funnel', () => {
    it('should return funnel with all 6 stages', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/dashboard/funnel',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<FunnelItem[]>();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(6);

      const stages = body.map((item) => item.stage);
      expect(stages).toContain('PROSPECTING');
      expect(stages).toContain('CLOSED_WON');
      expect(stages).toContain('CLOSED_LOST');
    });
  });
});
