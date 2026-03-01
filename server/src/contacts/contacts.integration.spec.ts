/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { cleanDatabase } from '../test/helpers/database-cleaner';
import { createTestApplication } from '../test/helpers/test-application.factory';
import {
  TEST_TENANT_ID,
  seedTestTenant,
} from '../test/helpers/test-data-seeder';

// UUIDs estáticos para asserts determinísticos
const OWNER_USER_ID = '00000000-0000-0000-0000-000000000010';
const MEMBER_USER_ID = '00000000-0000-0000-0000-000000000011';
const OTHER_MEMBER_ID = '00000000-0000-0000-0000-000000000012';

describe('ContactsController (Integration)', () => {
  let application: NestFastifyApplication;
  let prisma: PrismaService;

  // Tokens JWT dos usuários de teste
  let ownerToken: string;
  let memberToken: string;
  let otherToken: string;

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

    // Criar usuários de teste diretamente no banco
    const passwordHash = await argon2.hash('senha123456');

    await prisma.user.createMany({
      data: [
        {
          id: OWNER_USER_ID,
          tenantId: TEST_TENANT_ID,
          email: 'owner@test.com',
          name: 'Owner User',
          passwordHash,
          role: 'OWNER',
        },
        {
          id: MEMBER_USER_ID,
          tenantId: TEST_TENANT_ID,
          email: 'member@test.com',
          name: 'Member User',
          passwordHash,
          role: 'MEMBER',
        },
        {
          id: OTHER_MEMBER_ID,
          tenantId: TEST_TENANT_ID,
          email: 'other@test.com',
          name: 'Other Member',
          passwordHash,
          role: 'MEMBER',
        },
      ],
    });

    // Fazer login de cada usuário para obter tokens
    const loginPayload = (email: string) => ({
      method: 'POST' as const,
      url: '/auth/login',
      payload: { email, password: 'senha123456', tenantId: TEST_TENANT_ID },
    });

    const [ownerRes, memberRes, otherRes] = await Promise.all([
      application.inject(loginPayload('owner@test.com')),
      application.inject(loginPayload('member@test.com')),
      application.inject(loginPayload('other@test.com')),
    ]);

    ownerToken = ownerRes.json<{ access_token: string }>().access_token;
    memberToken = memberRes.json<{ access_token: string }>().access_token;
    otherToken = otherRes.json<{ access_token: string }>().access_token;
  });

  // Utilitário para criar contatos direto no banco
  const createContactInDb = async (ownerId: string, data?: object) =>
    prisma.contact.create({
      data: {
        tenantId: TEST_TENANT_ID,
        ownerId,
        name: 'Contato Teste',
        email: `contato-${Math.random().toString(36).slice(2)}@empresa.com`,
        ...data,
      },
    });

  // ──────────────────────────────────────────────────────────
  // POST /contacts
  // ──────────────────────────────────────────────────────────
  describe('POST /contacts', () => {
    it('cria contato com ownerId correto (MEMBER)', async () => {
      const res = await application.inject({
        method: 'POST',
        url: '/contacts',
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { name: 'João Silva', email: 'joao@empresa.com' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('ownerId', MEMBER_USER_ID);
      expect(body).toHaveProperty('tenantId', TEST_TENANT_ID);
      expect(body).not.toHaveProperty('deletedAt', expect.any(Date));
    });

    it('retorna 401 sem token', async () => {
      const res = await application.inject({
        method: 'POST',
        url: '/contacts',
        payload: { name: 'X', email: 'x@x.com' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('retorna 409 se email duplicado no mesmo tenant', async () => {
      await createContactInDb(MEMBER_USER_ID, { email: 'duplicate@emp.com' });

      const res = await application.inject({
        method: 'POST',
        url: '/contacts',
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { name: 'Outro', email: 'duplicate@emp.com' },
      });

      expect(res.statusCode).toBe(409);
    });
  });

  // ──────────────────────────────────────────────────────────
  // GET /contacts
  // ──────────────────────────────────────────────────────────
  describe('GET /contacts', () => {
    beforeEach(async () => {
      // 2 contatos do member, 1 do outro member
      await Promise.all([
        createContactInDb(MEMBER_USER_ID),
        createContactInDb(MEMBER_USER_ID),
        createContactInDb(OTHER_MEMBER_ID),
      ]);
    });

    it('MEMBER vê apenas seus 2 contatos', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/contacts',
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: unknown[]; total: number }>();
      expect(body.total).toBe(2);
      expect(body.data).toHaveLength(2);
    });

    it('OWNER vê todos os 3 contatos do tenant', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/contacts',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: unknown[]; total: number }>();
      expect(body.total).toBe(3);
    });

    it('paginação funciona corretamente', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/contacts?page=1&limit=2',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      const body = res.json<{
        data: unknown[];
        page: number;
        limit: number;
        total: number;
      }>();
      expect(body.data).toHaveLength(2);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(2);
      expect(body.total).toBe(3);
    });
  });

  // ──────────────────────────────────────────────────────────
  // GET /contacts/:id
  // ──────────────────────────────────────────────────────────
  describe('GET /contacts/:id', () => {
    it('MEMBER acessa seu próprio contato', async () => {
      const contact = await createContactInDb(MEMBER_USER_ID);
      const res = await application.inject({
        method: 'GET',
        url: `/contacts/${contact.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('id', contact.id);
    });

    it('MEMBER recebe 403 ao acessar contato de outro membro', async () => {
      const contact = await createContactInDb(OTHER_MEMBER_ID);
      const res = await application.inject({
        method: 'GET',
        url: `/contacts/${contact.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('OWNER acessa qualquer contato do tenant', async () => {
      const contact = await createContactInDb(OTHER_MEMBER_ID);
      const res = await application.inject({
        method: 'GET',
        url: `/contacts/${contact.id}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(200);
    });

    it('retorna 404 para id inexistente', async () => {
      const res = await application.inject({
        method: 'GET',
        url: '/contacts/00000000-0000-0000-0000-000000000099',
        headers: { authorization: `Bearer ${memberToken}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ──────────────────────────────────────────────────────────
  // PATCH /contacts/:id
  // ──────────────────────────────────────────────────────────
  describe('PATCH /contacts/:id', () => {
    it('MEMBER atualiza seu próprio contato', async () => {
      const contact = await createContactInDb(MEMBER_USER_ID);
      const res = await application.inject({
        method: 'PATCH',
        url: `/contacts/${contact.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { name: 'Nome Atualizado' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('name', 'Nome Atualizado');
    });

    it('MEMBER recebe 403 ao tentar atualizar contato de outro', async () => {
      const contact = await createContactInDb(OTHER_MEMBER_ID);
      const res = await application.inject({
        method: 'PATCH',
        url: `/contacts/${contact.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { name: 'Hack' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('OWNER atualiza contato de qualquer membro', async () => {
      const contact = await createContactInDb(MEMBER_USER_ID);
      const res = await application.inject({
        method: 'PATCH',
        url: `/contacts/${contact.id}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { company: 'Nova Empresa' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('company', 'Nova Empresa');
    });
  });

  // ──────────────────────────────────────────────────────────
  // DELETE /contacts/:id
  // ──────────────────────────────────────────────────────────
  describe('DELETE /contacts/:id', () => {
    it('faz soft delete — deletedAt é preenchido', async () => {
      const contact = await createContactInDb(MEMBER_USER_ID);
      const res = await application.inject({
        method: 'DELETE',
        url: `/contacts/${contact.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(204);

      // Verificar que deletedAt foi setado no banco
      const deleted = await prisma.contact.findUnique({
        where: { id: contact.id },
      });
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('contato soft-deleted não aparece em listagens', async () => {
      const contact = await createContactInDb(MEMBER_USER_ID);

      await application.inject({
        method: 'DELETE',
        url: `/contacts/${contact.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      const res = await application.inject({
        method: 'GET',
        url: '/contacts',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      const body = res.json<{ total: number }>();
      expect(body.total).toBe(0);
    });

    it('MEMBER recebe 403 ao tentar deletar contato de outro', async () => {
      const contact = await createContactInDb(OTHER_MEMBER_ID);
      const res = await application.inject({
        method: 'DELETE',
        url: `/contacts/${contact.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('contato de outro membro não foi deletado após tentativa negada', async () => {
      const contact = await createContactInDb(OTHER_MEMBER_ID);

      // Tentativa negada
      await application.inject({
        method: 'DELETE',
        url: `/contacts/${contact.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      const otherRes = await application.inject({
        method: 'GET',
        url: '/contacts',
        headers: { authorization: `Bearer ${otherToken}` },
      });

      const body = otherRes.json<{ total: number }>();
      expect(body.total).toBe(1); // Ainda existe
    });
  });
});
