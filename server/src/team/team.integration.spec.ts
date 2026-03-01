/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { ValidationPipe } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AppModule } from '../app.module';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_QUEUE } from '../queues/queues.module';
import { MailProcessor } from '../queues/processors/mail.processor';
import { cleanDatabase } from '../test/helpers/database-cleaner';
import {
  TEST_TENANT_ID,
  seedTestTenant,
} from '../test/helpers/test-data-seeder';

const mockMailQueue = { add: vi.fn().mockResolvedValue({ id: 'job-1' }) };

/** Substitui o MailProcessor sem @Processor, evitando criação de Worker BullMQ em testes */
class FakeMailProcessor {
  process = vi.fn();
}

describe('TeamController (Integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  // Tokens JWT de cada papel
  let ownerToken: string;
  let adminToken: string;
  let memberToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken(MAIL_QUEUE))
      .useValue(mockMailQueue)
      .overrideProvider(MailProcessor)
      .useClass(FakeMailProcessor)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanDatabase();
    await seedTestTenant(prisma);

    // Criar OWNER
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantId: TEST_TENANT_ID,
        email: 'owner@team.test',
        password: 'Senha123!',
        name: 'Owner User',
      },
    });
    await prisma.user.update({
      where: {
        tenantId_email: { tenantId: TEST_TENANT_ID, email: 'owner@team.test' },
      },
      data: { role: Role.OWNER },
    });
    const ownerLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'owner@team.test',
        password: 'Senha123!',
        tenantId: TEST_TENANT_ID,
      },
    });
    ownerToken = ownerLogin.json().access_token as string;

    // Criar ADMIN
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantId: TEST_TENANT_ID,
        email: 'admin@team.test',
        password: 'Senha123!',
        name: 'Admin User',
      },
    });
    void adminRes;
    await prisma.user.update({
      where: {
        tenantId_email: { tenantId: TEST_TENANT_ID, email: 'admin@team.test' },
      },
      data: { role: Role.ADMIN },
    });
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'admin@team.test',
        password: 'Senha123!',
        tenantId: TEST_TENANT_ID,
      },
    });
    adminToken = adminLogin.json().access_token as string;

    // Criar MEMBER
    const memberRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantId: TEST_TENANT_ID,
        email: 'member@team.test',
        password: 'Senha123!',
        name: 'Member User',
      },
    });
    void memberRes;
    const memberLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'member@team.test',
        password: 'Senha123!',
        tenantId: TEST_TENANT_ID,
      },
    });
    memberToken = memberLogin.json().access_token as string;
  });

  // ─────────────────── GET /team/members ───────────────────────
  describe('GET /team/members', () => {
    it('deve listar membros para qualquer usuário autenticado', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/team/members',
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(3);
    });

    it('deve retornar 401 sem autenticação', async () => {
      const res = await app.inject({ method: 'GET', url: '/team/members' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ─────────────────── POST /team/invite ───────────────────────
  describe('POST /team/invite', () => {
    it('OWNER deve criar convite e enfileirar job de email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/team/invite',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { email: 'novato@example.com', role: 'MEMBER' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toHaveProperty('email', 'novato@example.com');
      expect(body).toHaveProperty('status', 'PENDING');
      expect(mockMailQueue.add).toHaveBeenCalledOnce();
    });

    it('ADMIN deve criar convite com sucesso', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/team/invite',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { email: 'novo2@example.com', role: 'MEMBER' },
      });

      expect(res.statusCode).toBe(201);
    });

    it('MEMBER deve receber 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/team/invite',
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { email: 'alguem@example.com', role: 'MEMBER' },
      });

      expect(res.statusCode).toBe(403);
      expect(mockMailQueue.add).not.toHaveBeenCalled();
    });

    it('deve retornar 400 para email já cadastrado no tenant', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/team/invite',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { email: 'member@team.test', role: 'MEMBER' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('deve retornar 400 para email inválido', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/team/invite',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { email: 'invalido', role: 'MEMBER' },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ─────────────────── GET /team/invites ───────────────────────
  describe('GET /team/invites', () => {
    it('deve listar convites pendentes para ADMIN+', async () => {
      await app.inject({
        method: 'POST',
        url: '/team/invite',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { email: 'pendente@example.com', role: 'MEMBER' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/team/invites',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.length).toBe(1);
    });

    it('MEMBER deve receber 403', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/team/invites',
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ─────────────────── GET /team/invite/:token ─────────────────
  describe('GET /team/invite/:token', () => {
    it('deve retornar dados do convite pelo token (sem auth)', async () => {
      const inviteRes = await app.inject({
        method: 'POST',
        url: '/team/invite',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { email: 'convidado@example.com', role: 'MEMBER' },
      });
      const invite = inviteRes.json();
      const dbInvite = await prisma.teamInvite.findUnique({
        where: { id: invite.id as string },
        select: { token: true },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/team/invite/${dbInvite!.token}`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('email', 'convidado@example.com');
    });

    it('deve retornar 404 para token inexistente', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/team/invite/token-falso',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ─────────────────── POST /team/accept/:token ────────────────
  describe('POST /team/accept/:token', () => {
    it('deve criar usuário ao aceitar convite válido', async () => {
      const inviteRes = await app.inject({
        method: 'POST',
        url: '/team/invite',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { email: 'aceitar@example.com', role: 'ADMIN' },
      });
      const invite = inviteRes.json();
      const dbInvite = await prisma.teamInvite.findUnique({
        where: { id: invite.id as string },
        select: { token: true },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/team/accept/${dbInvite!.token}`,
        payload: { name: 'Novo Admin', password: 'NovaSenha1!' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toHaveProperty('email', 'aceitar@example.com');
      expect(body).toHaveProperty('role', 'ADMIN');

      const dbUser = await prisma.user.findFirst({
        where: { email: 'aceitar@example.com' },
      });
      expect(dbUser).toBeDefined();
    });

    it('deve retornar 404 para token inválido', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/team/accept/token-invalido',
        payload: { name: 'Alguém', password: 'Senha123!' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ─────────────────── DELETE /team/invites/:id ────────────────
  describe('DELETE /team/invites/:id', () => {
    it('deve revogar convite pendente (ADMIN+)', async () => {
      const inviteRes = await app.inject({
        method: 'POST',
        url: '/team/invite',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { email: 'revogar@example.com', role: 'MEMBER' },
      });
      const invite = inviteRes.json();

      const res = await app.inject({
        method: 'DELETE',
        url: `/team/invites/${invite.id as string}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(200);
    });
  });
});
