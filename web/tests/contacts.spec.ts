import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Contacts page (/contacts).
 *
 * Pre-requisite: NestJS server running on :3333 with seeded test data.
 * The Vite dev server is started automatically by playwright.config.ts webServer.
 */

test.describe('Página de Contatos', () => {
  test.beforeEach(async ({ page }) => {
    // Login via form na página /login
    await page.goto('/login');
    await page.getByLabel(/e-?mail/i).fill('owner-e2e@test.com');
    await page.getByLabel(/senha/i).fill('senha123456');
    // tenantId field (hidden or visible depending on UI)
    const tenantInput = page
      .getByPlaceholder(/tenant/i)
      .or(page.getByLabel(/tenant/i));
    if ((await tenantInput.count()) > 0) {
      await tenantInput.fill('00000000-0000-0000-0000-000000000001');
    }
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await page.waitForURL('/dashboard');
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
  });

  test('lista contatos do tenant', async ({ page }) => {
    // Deve exibir pelo menos a heading da página
    await expect(
      page.getByRole('heading', { name: /contatos/i }),
    ).toBeVisible();
    // Tabela ou lista deve ser visível
    const rows = page.getByRole('row');
    await expect(rows.first()).toBeVisible();
  });

  test('cria novo contato', async ({ page }) => {
    // Abrir dialog de novo contato
    await page.getByRole('button', { name: /novo contato/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Preencher formulário
    const uniqueEmail = `e2e-${Date.now()}@testcontato.com`;
    await page.getByLabel(/nome/i).fill('Contato E2E');
    await page.getByLabel(/e-?mail/i).fill(uniqueEmail);
    await page.getByLabel(/empresa/i).fill('Empresa Teste E2E');

    // Submeter
    await page
      .getByRole('button', { name: /criar|salvar/i })
      .last()
      .click();

    // Dialog deve fechar e contato aparecer na lista
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Contato E2E')).toBeVisible();
  });

  test('edita contato existente', async ({ page }) => {
    // Aguarda pelo menos uma linha de dados (além do header)
    await expect(page.getByRole('row').nth(1)).toBeVisible();

    // Clica no botão de editar do primeiro contato
    await page
      .getByRole('row')
      .nth(1)
      .getByRole('button', { name: /editar/i })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Altera o nome
    const nameInput = page.getByLabel(/nome/i);
    await nameInput.clear();
    await nameInput.fill('Nome Editado E2E');

    await page
      .getByRole('button', { name: /salvar/i })
      .last()
      .click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Nome Editado E2E')).toBeVisible();
  });

  test('deleta contato', async ({ page }) => {
    // Aguarda pelo menos uma linha de dados
    await expect(page.getByRole('row').nth(1)).toBeVisible();

    // Pega o texto da primeira linha para validar remoção
    const firstRow = page.getByRole('row').nth(1);
    const rowText = await firstRow.innerText();
    const firstName = rowText.split('\t')[0].trim();

    await firstRow.getByRole('button', { name: /deletar|remover/i }).click();

    // Confirma no dialog/alert caso apareça
    const confirmBtn = page.getByRole('button', { name: /confirmar|sim|yes/i });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    // Contato deve sumir da lista
    await expect(page.getByText(firstName)).not.toBeVisible();
  });

  test('filtra contatos por busca', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|search/i);
    await expect(searchInput).toBeVisible();

    // Digita um termo que provavelmente não existe
    await searchInput.fill('xzxzxzxz_nao_existe_99');
    await page.waitForTimeout(600); // debounce

    // Tabela deve mostrar "nenhum resultado" ou apenas o header
    const rows = page.getByRole('row');
    const count = await rows.count();
    // Apenas o header (1 linha) ou nenhum dado
    expect(count).toBeLessThanOrEqual(2);
  });

  test('paginação funciona', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: /próxima|next|>/i });

    // Só testa se botão de próxima está presente (pode não existir se poucos registros)
    if ((await nextBtn.isVisible()) && (await nextBtn.isEnabled())) {
      await nextBtn.click();
      await page.waitForLoadState('networkidle');
      // URL ou estado deve mudar; verificamos que a página ainda está em /contacts
      await expect(page).toHaveURL(/contacts/);
    } else {
      test.skip();
    }
  });
});
