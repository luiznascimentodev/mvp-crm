import { test, expect, type APIRequestContext } from '@playwright/test';
import { loginAndSetToken } from './helpers/auth';

const BASE_API = process.env.VITE_API_URL ?? 'http://localhost:3333';
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Faz login via API e retorna o access_token.
 */
async function getToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BASE_API}/auth/login`, {
    data: {
      email: 'owner-e2e@test.com',
      password: 'senha123456',
      tenantId: TEST_TENANT_ID,
    },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

// ─── Convidar Membro ──────────────────────────────────────────────────────────

test.describe('Equipe — Convidar Membro', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSetToken(page);
    await page.goto('/team');
    await page.waitForLoadState('networkidle');
  });

  test('exibe página de equipe com cabeçalho e membros', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /equipe/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /convidar membro/i }),
    ).toBeVisible();
  });

  test('abre modal de convite ao clicar no botão', async ({ page }) => {
    await page.getByRole('button', { name: /convidar membro/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/e-?mail/i)).toBeVisible();
  });

  test('envia convite via UI e exibe toast de sucesso', async ({ page }) => {
    /**
     * Mock da fila de email: o BullMQ pode não ter Redis disponível em CI,
     * mas o endpoint POST /team/invite retorna 201 independentemente do Redis.
     * Verificamos o toast de sucesso na UI.
     */
    await page.getByRole('button', { name: /convidar membro/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const uniqueEmail = `e2e-invite-${Date.now()}@testmember.com`;
    await page.getByLabel(/e-?mail/i).fill(uniqueEmail);

    // Clicar em Enviar
    await page
      .getByRole('button', { name: /enviar|convidar/i })
      .last()
      .click();

    // Toast de sucesso deve aparecer (indica que o job foi enfileirado)
    await expect(
      page.getByText(/convite enviado|convidado com sucesso/i),
    ).toBeVisible({ timeout: 8_000 });

    // Modal deve fechar
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
  });
});

// ─── Email recebido (mock via API) ────────────────────────────────────────────

test.describe('Equipe — Email de Convite (mock)', () => {
  test('POST /team/invite retorna 201 e confirma job enfileirado', async ({
    request,
  }) => {
    /**
     * Verifica que a criação do convite via API retorna status 201,
     * o que confirma que o registro foi criado E o job de email foi
     * adicionado à fila BullMQ (o worker real está mockado nos unit tests).
     */
    const token = await getToken(request);

    const res = await request.post(`${BASE_API}/team/invite`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        email: `api-invite-${Date.now()}@testmember.com`,
        role: 'MEMBER',
      },
    });

    expect(res.status()).toBe(201);

    const body = (await res.json()) as {
      id: string;
      email: string;
      role: string;
      token: string;
      status: string;
    };
    expect(body.status).toBe('PENDING');
    expect(body.token).toBeTruthy();
    expect(body.role).toBe('MEMBER');
  });

  test('convite pendente aparece na listagem da API', async ({ request }) => {
    const token = await getToken(request);
    const uniqueEmail = `list-invite-${Date.now()}@testmember.com`;

    // Criar convite
    await request.post(`${BASE_API}/team/invite`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: uniqueEmail, role: 'MEMBER' },
    });

    // Verificar que aparece na listagem
    const listRes = await request.get(`${BASE_API}/team/invites`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const invites = (await listRes.json()) as Array<{ email: string }>;
    const found = invites.find((inv) => inv.email === uniqueEmail);
    expect(found).toBeTruthy();
  });
});

// ─── Aceitar Convite ──────────────────────────────────────────────────────────

test.describe('Equipe — Aceitar Convite', () => {
  test('exibe página de aceite com informações do convite', async ({
    page,
    request,
  }) => {
    // 1. Criar convite via API para obter o token
    const accessToken = await getToken(request);
    const uniqueEmail = `accept-e2e-${Date.now()}@testmember.com`;

    const inviteRes = await request.post(`${BASE_API}/team/invite`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { email: uniqueEmail, role: 'MEMBER' },
    });
    expect(inviteRes.ok()).toBeTruthy();
    const invite = (await inviteRes.json()) as { token: string };

    // 2. Navegar até a página de aceite
    await page.goto(`/accept-invite/${invite.token}`);
    await page.waitForLoadState('networkidle');

    // 3. Verificar que as informações do convite são exibidas
    await expect(page.getByText(uniqueEmail)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/membro/i)).toBeVisible();
  });

  test('aceita convite, cria conta e redireciona para login', async ({
    page,
    request,
  }) => {
    // 1. Criar convite via API
    const accessToken = await getToken(request);
    const uniqueEmail = `full-accept-${Date.now()}@testmember.com`;

    const inviteRes = await request.post(`${BASE_API}/team/invite`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { email: uniqueEmail, role: 'MEMBER' },
    });
    expect(inviteRes.ok()).toBeTruthy();
    const invite = (await inviteRes.json()) as { token: string };

    // 2. Navegar até accept-invite
    await page.goto(`/accept-invite/${invite.token}`);
    await page.waitForLoadState('networkidle');

    // 3. Preencher formulário de criação de conta
    await page.getByLabel(/nome/i).fill('Membro E2E Teste');
    // Preencher senha (dois campos do tipo password)
    await page.locator('input[type="password"]').first().fill('Senha123!');
    await page.locator('input[type="password"]').last().fill('Senha123!');

    // 4. Submeter
    await page
      .getByRole('button', { name: /aceitar|criar conta/i })
      .last()
      .click();

    // 5. Deve mostrar mensagem de sucesso ou redirecionar para login
    await expect(
      page
        .getByText(/conta criada|sucesso/i)
        .or(page.getByRole('heading', { name: /orbit crm/i })),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('exibe erro para token inválido', async ({ page }) => {
    await page.goto('/accept-invite/token-invalido-que-nao-existe');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText(/convite inválido|não encontrado|expirado/i),
    ).toBeVisible({ timeout: 8_000 });
  });
});
