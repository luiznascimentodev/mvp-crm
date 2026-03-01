import { test as base, expect, type Page } from '@playwright/test';

const BASE_API = process.env.VITE_API_URL ?? 'http://localhost:3333';
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const TEST_EMAIL = 'owner-e2e@test.com';
const TEST_PASSWORD = 'senha123456';

/**
 * Faz login via API e armazena o token no localStorage.
 * Usado no setup de cada teste E2E que precisa de autenticação.
 */
export async function loginAndSetToken(page: Page): Promise<string> {
  const res = await page.request.post(`${BASE_API}/auth/login`, {
    data: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      tenantId: TEST_TENANT_ID,
    },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { access_token: string };
  const token = body.access_token;

  // Injeta token no localStorage antes de navegar
  await page.goto('/');
  await page.evaluate((t) => {
    localStorage.setItem('access_token', t);
    // Também escreve no zustand persist key
    const auth = { state: { token: t }, version: 0 };
    localStorage.setItem('orbit-auth', JSON.stringify(auth));
  }, token);

  return token;
}

export const test = base;
export { expect };
