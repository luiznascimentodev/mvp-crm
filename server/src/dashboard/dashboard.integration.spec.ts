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
  totalLeads: number;
  wonLeads: number;
  conversionRate: number;
  leadsByStatus: unknown[];
}

interface FunnelItem {
  status: string;
  count: number;
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
      expect(body).toHaveProperty('totalLeads');
      expect(body).toHaveProperty('wonLeads');
      expect(body).toHaveProperty('conversionRate');
      expect(body).toHaveProperty('leadsByStatus');
      expect(Array.isArray(body.leadsByStatus)).toBe(true);
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
      expect(body.totalLeads).toBe(0);
      expect(body.conversionRate).toBe(0);
    });
  });

  describe('GET /dashboard/leads-over-time', () => {
    it('should return array of daily lead stats', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/dashboard/leads-over-time?days=7',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<unknown[]>();
      expect(Array.isArray(body)).toBe(true);
    });

    it('should default to 30 days when no param', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/dashboard/leads-over-time',
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
      expect(body).toHaveLength(7);

      const statuses = body.map((item) => item.status);
      expect(statuses).toContain('new');
      expect(statuses).toContain('won');
      expect(statuses).toContain('lost');
    });
  });
});
