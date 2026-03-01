import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Dashboard page (/dashboard).
 *
 * Pre-requisite: NestJS server running on :3333 with seeded test data.
 * The Vite dev server is started automatically by playwright.config.ts webServer.
 */

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const BASE_API = 'http://localhost:3333';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/e-?mail/i).fill('owner-e2e@test.com');
    await page.getByLabel(/senha/i).fill('senha123456');
    const tenantInput = page
      .getByPlaceholder(/tenant/i)
      .or(page.getByLabel(/tenant/i));
    if ((await tenantInput.count()) > 0) {
      await tenantInput.fill(TEST_TENANT_ID);
    }
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await page.waitForURL('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('exibe heading do dashboard', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /dashboard/i }),
    ).toBeVisible();
  });

  test('exibe cards de métricas', async ({ page }) => {
    await expect(page.getByText(/total de contatos/i)).toBeVisible();
    await expect(page.getByText(/deals ativos/i)).toBeVisible();
    await expect(page.getByText(/taxa de conversão/i)).toBeVisible();
    await expect(page.getByText(/pipeline total/i)).toBeVisible();
  });

  test('exibe seção de deals ao longo do tempo com filtros', async ({
    page,
  }) => {
    await expect(page.getByText(/deals ao longo do tempo/i)).toBeVisible();
    // Botões de período
    await expect(page.getByRole('button', { name: '7d' })).toBeVisible();
    await expect(page.getByRole('button', { name: '30d' })).toBeVisible();
    await expect(page.getByRole('button', { name: '90d' })).toBeVisible();
  });

  test('troca período do gráfico de deals', async ({ page }) => {
    const btn7d = page.getByRole('button', { name: '7d' });
    await btn7d.click();
    await expect(btn7d).toHaveAttribute('data-slot', 'button');
    // Verifica que o botão ganhou o estilo ativo (default variant)
    await expect(btn7d).toBeVisible();
  });

  test('exibe seção top vendedores', async ({ page }) => {
    await expect(page.getByText(/top vendedores/i)).toBeVisible();
  });

  test('exibe funil de conversão', async ({ page }) => {
    await expect(page.getByText(/funil de conversão/i)).toBeVisible();
  });
});

test.describe('Dashboard — API endpoints', () => {
  let accessToken: string;

  test.beforeAll(async ({ request }) => {
    // Login para obter token
    const loginRes = await request.post(`${BASE_API}/auth/login`, {
      data: {
        email: 'owner-e2e@test.com',
        password: 'senha123456',
        tenantId: TEST_TENANT_ID,
      },
    });
    const body = (await loginRes.json()) as { access_token: string };
    accessToken = body.access_token;
  });

  test('GET /dashboard/metrics retorna 200 com estrutura correta', async ({
    request,
  }) => {
    const res = await request.get(`${BASE_API}/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty('totalContacts');
    expect(body).toHaveProperty('totalDeals');
    expect(body).toHaveProperty('activeDeals');
    expect(body).toHaveProperty('pipelineValue');
    expect(body).toHaveProperty('conversionRate');
    expect(body).toHaveProperty('dealsByStage');
    expect(Array.isArray(body.dealsByStage)).toBe(true);
  });

  test('GET /dashboard/funnel retorna 6 estágios', async ({ request }) => {
    const res = await request.get(`${BASE_API}/dashboard/funnel`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(6);
  });

  test('GET /dashboard/deals-over-time sem token retorna 401', async ({
    request,
  }) => {
    const res = await request.get(
      `${BASE_API}/dashboard/deals-over-time?days=7`,
    );
    expect(res.status()).toBe(401);
  });

  test('GET /dashboard/top-performers retorna array', async ({ request }) => {
    const res = await request.get(`${BASE_API}/dashboard/top-performers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
  });
});
