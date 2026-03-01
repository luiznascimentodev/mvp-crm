import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { InviteStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_QUEUE } from '../queues/queues.module';
import { SEND_INVITE_JOB } from '../queues/processors/mail.processor';
import { TeamService } from './team.service';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const OWNER_ID = '00000000-0000-0000-0000-000000000010';

describe('TeamService', () => {
  let service: TeamService;
  let prisma: PrismaService;
  let mailQueue: { add: ReturnType<typeof vi.fn> };

  const mockPrisma = {
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    tenant: {
      findUniqueOrThrow: vi.fn(),
    },
    teamInvite: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const mockMailQueue = {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  };

  const mockConfig = {
    get: vi.fn((key: string) => {
      const vars: Record<string, unknown> = {
        FRONTEND_URL: 'http://localhost:5173',
        SMTP_HOST: 'smtp.test.com',
        SMTP_PORT: 587,
        SMTP_USER: 'user',
        SMTP_PASS: 'pass',
        SMTP_FROM: 'test@orbit.app',
      };
      return vars[key];
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: getQueueToken(MAIL_QUEUE), useValue: mockMailQueue },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
    prisma = module.get<PrismaService>(PrismaService);
    mailQueue = module.get(getQueueToken(MAIL_QUEUE));
  });

  // ─────────────────────── inviteMember ───────────────────────
  describe('inviteMember', () => {
    const dto = { email: 'novo@example.com', role: Role.MEMBER };

    beforeEach(() => {
      prisma.user.findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.tenant.findUniqueOrThrow = vi.fn().mockResolvedValue({
        name: 'Acme',
        maxUsers: 10,
        _count: { users: 2 },
      });
      mockPrisma.teamInvite.updateMany = vi
        .fn()
        .mockResolvedValue({ count: 0 });
      mockPrisma.teamInvite.create = vi.fn().mockResolvedValue({
        id: 'invite-1',
        email: dto.email,
        role: Role.MEMBER,
        expiresAt: new Date(),
        status: InviteStatus.PENDING,
        invitedBy: { name: 'Owner' },
      });
    });

    it('deve criar convite e adicionar job na fila', async () => {
      const result = await service.inviteMember(TENANT_ID, OWNER_ID, dto);

      expect(mockPrisma.teamInvite.create).toHaveBeenCalledOnce();
      expect(mailQueue.add).toHaveBeenCalledOnce();
      expect(mailQueue.add).toHaveBeenCalledWith(
        SEND_INVITE_JOB,
        expect.objectContaining({
          email: dto.email,
          inviterName: 'Owner',
          tenantName: 'Acme',
          role: Role.MEMBER,
        }),
      );
      expect(result).toHaveProperty('email', dto.email);
    });

    it('deve lançar ForbiddenException ao convidar como OWNER', async () => {
      await expect(
        service.inviteMember(TENANT_ID, OWNER_ID, {
          email: dto.email,
          role: Role.OWNER,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(mailQueue.add).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException se email já existe no tenant', async () => {
      prisma.user.findFirst = vi.fn().mockResolvedValue({ id: 'u-1' });

      await expect(
        service.inviteMember(TENANT_ID, OWNER_ID, dto),
      ).rejects.toThrow(BadRequestException);
      expect(mailQueue.add).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando tenant atinge limite de usuários', async () => {
      mockPrisma.tenant.findUniqueOrThrow = vi.fn().mockResolvedValue({
        name: 'Acme',
        maxUsers: 5,
        _count: { users: 5 },
      });

      await expect(
        service.inviteMember(TENANT_ID, OWNER_ID, dto),
      ).rejects.toThrow(BadRequestException);
      expect(mailQueue.add).not.toHaveBeenCalled();
    });

    it('deve expirar convites pendentes anteriores antes de criar novo', async () => {
      await service.inviteMember(TENANT_ID, OWNER_ID, dto);

      expect(mockPrisma.teamInvite.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          email: dto.email,
          status: InviteStatus.PENDING,
        },
        data: { status: InviteStatus.EXPIRED },
      });
    });
  });

  // ─────────────────────── acceptInvite ───────────────────────
  describe('acceptInvite', () => {
    const validToken = 'valid-token-abc';
    const dto = { password: 'Senha123!', name: 'Novo Membro' };

    beforeEach(() => {
      mockPrisma.teamInvite.findUnique = vi.fn().mockResolvedValue({
        id: 'invite-1',
        tenantId: TENANT_ID,
        email: 'novo@example.com',
        role: Role.MEMBER,
        status: InviteStatus.PENDING,
        expiresAt: new Date(Date.now() + 86400000), // +1 dia
        tenant: { name: 'Acme', isActive: true },
      });
      prisma.user.findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.$transaction = vi.fn().mockResolvedValue([
        {
          id: 'u-new',
          email: 'novo@example.com',
          name: dto.name,
          role: Role.MEMBER,
        },
        {},
      ]);
    });

    it('deve criar usuário e marcar convite como aceito', async () => {
      const result = await service.acceptInvite(validToken, dto);

      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
      expect(result).toMatchObject({
        email: 'novo@example.com',
        name: dto.name,
      });
    });

    it('deve lançar NotFoundException para token inválido', async () => {
      mockPrisma.teamInvite.findUnique = vi.fn().mockResolvedValue(null);

      await expect(service.acceptInvite('bad-token', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException para convite já aceito', async () => {
      mockPrisma.teamInvite.findUnique = vi.fn().mockResolvedValue({
        id: 'i-1',
        status: InviteStatus.ACCEPTED,
        expiresAt: new Date(Date.now() + 86400000),
        tenant: { isActive: true },
      });

      await expect(service.acceptInvite(validToken, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException para convite expirado (data)', async () => {
      mockPrisma.teamInvite.findUnique = vi.fn().mockResolvedValue({
        id: 'i-1',
        tenantId: TENANT_ID,
        status: InviteStatus.PENDING,
        expiresAt: new Date(Date.now() - 86400000), // -1 dia
        tenant: { isActive: true },
      });
      mockPrisma.teamInvite.update = vi.fn().mockResolvedValue({});

      await expect(service.acceptInvite(validToken, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.teamInvite.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: InviteStatus.EXPIRED } }),
      );
    });
  });

  // ─────────────────────── revokeInvite ───────────────────────
  describe('revokeInvite', () => {
    it('deve marcar convite como EXPIRED', async () => {
      mockPrisma.teamInvite.findFirst = vi.fn().mockResolvedValue({
        id: 'i-1',
        status: InviteStatus.PENDING,
      });
      mockPrisma.teamInvite.update = vi.fn().mockResolvedValue({});

      const result = await service.revokeInvite(TENANT_ID, 'i-1');

      expect(mockPrisma.teamInvite.update).toHaveBeenCalledWith({
        where: { id: 'i-1' },
        data: { status: InviteStatus.EXPIRED },
      });
      expect(result).toHaveProperty('message');
    });

    it('deve lançar NotFoundException para convite inexistente', async () => {
      mockPrisma.teamInvite.findFirst = vi.fn().mockResolvedValue(null);

      await expect(service.revokeInvite(TENANT_ID, 'i-fake')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
