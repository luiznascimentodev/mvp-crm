/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DealStage } from '@prisma/client';
import * as argon2 from 'argon2';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { cleanDatabase } from '../test/helpers/database-cleaner';
import { createTestApplication } from '../test/helpers/test-application.factory';
import {
  TEST_TENANT_ID,
  seedTestTenant,
} from '../test/helpers/test-data-seeder';

const OWNER_USER_ID = '11111111-1111-4111-a111-111111111110';
const MEMBER_USER_ID = '22222222-2222-4222-a222-222222222220';
const OTHER_MEMBER_ID = '33333333-3333-4333-a333-333333333330';
let createdContactId: string;

describe('DealsController (Integration)', () => {
  let application: NestFastifyApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let memberToken: string;

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

    const passwordHash = await argon2.hash('senha123456');

    await prisma.user.createMany({
      data: [
        {
          id: OWNER_USER_ID,
          tenantId: TEST_TENANT_ID,
          email: 'owner-deals@test.com',
          name: 'Owner User',
          passwordHash,
          role: 'OWNER',
        },
        {
          id: MEMBER_USER_ID,
          tenantId: TEST_TENANT_ID,
          email: 'member-deals@test.com',
          name: 'Member User',
          passwordHash,
          role: 'MEMBER',
        },
        {
          id: OTHER_MEMBER_ID,
          tenantId: TEST_TENANT_ID,
          email: 'other-deals@test.com',
          name: 'Other Member',
          passwordHash,
          role: 'MEMBER',
        },
      ],
    });

    // Criar contato de teste
    const contact = await prisma.contact.create({
      data: {
        tenantId: TEST_TENANT_ID,
        ownerId: MEMBER_USER_ID,
        name: 'Contato para Deal',
        email: 'contato-deal@empresa.com',
      },
    });
    createdContactId = contact.id;

    const loginPayload = (email: string) => ({
      method: 'POST' as const,
      url: '/auth/login',
      payload: { email, password: 'senha123456', tenantId: TEST_TENANT_ID },
    });

    const [ownerRes, memberRes] = await Promise.all([
      application.inject(loginPayload('owner-deals@test.com')),
      application.inject(loginPayload('member-deals@test.com')),
    ]);

    ownerToken = ownerRes.json<{ access_token: string }>().access_token;
    memberToken = memberRes.json<{ access_token: string }>().access_token;
  });

  // Helper para criar deal direto no banco
  const createDealInDb = async (ownerId: string, override?: object) =>
    prisma.deal.create({
      data: {
        tenantId: TEST_TENANT_ID,
        ownerId,
        contactId: createdContactId,
        title: 'Deal Teste',
        value: 5000,
        currency: 'BRL',
        stage: DealStage.PROSPECTING,
        probability: 10,
        ...override,
      },
    });

  // ──────────────────────────────────────────────────────────
  // POST /deals
  // ──────────────────────────────────────────────────────────
  describe('POST /deals', () => {
    it('cria deal com ownerId do usuário autenticado', async () => {
      const res = await application.inject({
        method: 'POST',
        url: '/deals',
        headers: { authorization: `Bearer ${memberToken}` },
        payload: {
          title: 'Novo Deal',
          value: 10000,
          contactId: createdContactId,
          stage: DealStage.PROSPECTING,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('ownerId', MEMBER_USER_ID);
      expect(body).toHaveProperty('tenantId', TEST_TENANT_ID);
      expect(body).toHaveProperty('stage', DealStage.PROSPECTING);
    });

    it('retorna 401 sem token', async () => {
      const res = await application.inject({
        method: 'POST',
        url: '/deals',
        payload: {
          title: 'Deal',
          value: 1000,
          contactId: createdContactId,
          stage: DealStage.PROSPECTING,
        },
      });
      expect(res.statusCode).toBe(401);
    });

    it('retorna 404 quando contactId não existe no tenant', async () => {
      const res = await application.inject({
        method: 'POST',
        url: '/deals',
        headers: { authorization: `Bearer ${memberToken}` },
        payload: {
          title: 'Deal Inválido',
          value: 1000,
          contactId: '55555555-5555-4555-a555-555555555555',
          stage: DealStage.PROSPECTING,
        },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ──────────────────────────────────────────────────────────
  // GET /deals
  // ──────────────────────────────────────────────────────────
  describe('GET /deals', () => {
    it('OWNER vê todos os deals do tenant', async () => {
      await Promise.all([
        createDealInDb(MEMBER_USER_ID),
        createDealInDb(OTHER_MEMBER_ID),
      ]);

      const res = await application.inject({
        method: 'GET',
        url: '/deals',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBe(2);
    });

    it('MEMBER vê apenas seus próprios deals', async () => {
      await Promise.all([
        createDealInDb(MEMBER_USER_ID),
        createDealInDb(OTHER_MEMBER_ID),
      ]);

      const res = await application.inject({
        method: 'GET',
        url: '/deals',
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBe(1);
      expect(body.data[0].ownerId).toBe(MEMBER_USER_ID);
    });

    it('suporta paginação via query params', async () => {
      await Promise.all([
        createDealInDb(OWNER_USER_ID, { title: 'Deal A' }),
        createDealInDb(OWNER_USER_ID, { title: 'Deal B' }),
        createDealInDb(OWNER_USER_ID, { title: 'Deal C' }),
      ]);

      const res = await application.inject({
        method: 'GET',
        url: '/deals?page=1&limit=2',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(3);
    });
  });

  // ──────────────────────────────────────────────────────────
  // GET /deals/:id
  // ──────────────────────────────────────────────────────────
  describe('GET /deals/:id', () => {
    it('retorna o deal pelo id', async () => {
      const deal = await createDealInDb(MEMBER_USER_ID);

      const res = await application.inject({
        method: 'GET',
        url: `/deals/${deal.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe(deal.id);
    });

    it('retorna 403 quando MEMBER tenta ver deal alheio', async () => {
      const deal = await createDealInDb(OTHER_MEMBER_ID);

      const res = await application.inject({
        method: 'GET',
        url: `/deals/${deal.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('retorna 404 para deal inexistente', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/deals/00000000-0000-0000-0000-000000000000',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ──────────────────────────────────────────────────────────
  // PATCH /deals/:id
  // ──────────────────────────────────────────────────────────
  describe('PATCH /deals/:id', () => {
    it('atualiza o deal corretamente', async () => {
      const deal = await createDealInDb(MEMBER_USER_ID);

      const res = await application.inject({
        method: 'PATCH',
        url: `/deals/${deal.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { title: 'Deal Atualizado', value: 20000 },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.title).toBe('Deal Atualizado');
      expect(Number(body.value)).toBe(20000);
    });

    it('MEMBER não pode editar deal de outro usuário', async () => {
      const deal = await createDealInDb(OTHER_MEMBER_ID);

      const res = await application.inject({
        method: 'PATCH',
        url: `/deals/${deal.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { title: 'Tentativa Indevida' },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ──────────────────────────────────────────────────────────
  // PATCH /deals/:id/stage
  // ──────────────────────────────────────────────────────────
  describe('PATCH /deals/:id/stage', () => {
    it('move deal para CLOSED_WON e seta probability=100', async () => {
      const deal = await createDealInDb(MEMBER_USER_ID);

      const res = await application.inject({
        method: 'PATCH',
        url: `/deals/${deal.id}/stage`,
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { stage: DealStage.CLOSED_WON },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.stage).toBe(DealStage.CLOSED_WON);
      expect(body.probability).toBe(100);
      expect(body.isActive).toBe(false);
    });

    it('move deal para QUALIFICATION sem fechar', async () => {
      const deal = await createDealInDb(MEMBER_USER_ID);

      const res = await application.inject({
        method: 'PATCH',
        url: `/deals/${deal.id}/stage`,
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { stage: DealStage.QUALIFICATION },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.stage).toBe(DealStage.QUALIFICATION);
      expect(body.isActive).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────
  // DELETE /deals/:id
  // ──────────────────────────────────────────────────────────
  describe('DELETE /deals/:id', () => {
    it('faz soft-delete do deal (204)', async () => {
      const deal = await createDealInDb(MEMBER_USER_ID);

      const res = await application.inject({
        method: 'DELETE',
        url: `/deals/${deal.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(204);

      // Verificar que deal está marcado como deletado
      const deleted = await prisma.deal.findUnique({ where: { id: deal.id } });
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('deal deletado não aparece no GET /deals', async () => {
      const deal = await createDealInDb(MEMBER_USER_ID);
      await prisma.deal.update({
        where: { id: deal.id },
        data: { deletedAt: new Date() },
      });

      const res = await application.inject({
        method: 'GET',
        url: '/deals',
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBe(0);
    });

    it('MEMBER não pode deletar deal de outro usuário', async () => {
      const deal = await createDealInDb(OTHER_MEMBER_ID);

      const res = await application.inject({
        method: 'DELETE',
        url: `/deals/${deal.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
