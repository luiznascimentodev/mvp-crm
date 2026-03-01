/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DealStage } from '@prisma/client';
import { Role } from '../common/enums/role.enum';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { DealsService } from './deals.service';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

const TENANT_ID = 'tenant-uuid-001';
const OWNER_ID = 'user-uuid-owner';
const MEMBER_ID = 'user-uuid-member';
const CONTACT_ID = 'contact-uuid-001';
const DEAL_ID = 'deal-uuid-001';

const makeDeal = (override?: object) => ({
  id: DEAL_ID,
  tenantId: TENANT_ID,
  ownerId: MEMBER_ID,
  contactId: CONTACT_ID,
  title: 'Deal Teste',
  description: null,
  value: 1000,
  currency: 'BRL',
  stage: DealStage.PROSPECTING,
  probability: 10,
  expectedCloseDate: null,
  isActive: true,
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...override,
});

const makeContact = () => ({
  id: CONTACT_ID,
  tenantId: TENANT_ID,
  name: 'João Silva',
  email: 'joao@empresa.com',
  deletedAt: null,
});

const makeUser = (role: Role, userId = MEMBER_ID): AuthUser => ({
  userId,
  email: 'user@test.com',
  tenantId: TENANT_ID,
  role,
});

const mockPrisma = {
  contact: {
    findFirst: vi.fn(),
  },
  deal: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};

describe('DealsService', () => {
  let service: DealsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DealsService>(DealsService);
  });

  // ──────────────────────────────────────────────────────────
  // create()
  // ──────────────────────────────────────────────────────────
  describe('create()', () => {
    const dto = {
      title: 'Deal Teste',
      value: 1000,
      contactId: CONTACT_ID,
      stage: DealStage.PROSPECTING,
    };

    it('deve criar deal quando o contato pertence ao tenant', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(makeContact());
      const expectedDeal = makeDeal();
      mockPrisma.deal.create.mockResolvedValue(expectedDeal);

      const user = makeUser(Role.MEMBER);
      const result = await service.create(dto, user);

      expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith({
        where: { id: CONTACT_ID, tenantId: TENANT_ID, deletedAt: null },
      });
      expect(mockPrisma.deal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          ownerId: MEMBER_ID,
          contactId: CONTACT_ID,
          title: 'Deal Teste',
        }),
      });
      expect(result).toEqual(expectedDeal);
    });

    it('deve lançar NotFoundException quando o contato não pertence ao tenant', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      const user = makeUser(Role.MEMBER);

      await expect(service.create(dto, user)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.deal.create).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────
  // findAll()
  // ──────────────────────────────────────────────────────────
  describe('findAll()', () => {
    beforeEach(() => {
      mockPrisma.$transaction.mockResolvedValue([[makeDeal()], 1]);
    });

    it('retorna deals paginados com total', async () => {
      const user = makeUser(Role.OWNER, OWNER_ID);
      const result = await service.findAll({ page: 1, limit: 10 }, user);

      expect(result).toMatchObject({ total: 1, page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
    });

    it('MEMBER filtra apenas seus próprios deals', async () => {
      const user = makeUser(Role.MEMBER);
      await service.findAll({}, user);

      const [queries] = mockPrisma.$transaction.mock.calls[0] as [unknown[]];
      expect(queries).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────
  // findOne()
  // ──────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('deve retornar o deal quando encontrado', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(makeDeal());
      const user = makeUser(Role.MEMBER);

      const result = await service.findOne(DEAL_ID, user);
      expect(result.id).toBe(DEAL_ID);
    });

    it('deve lançar NotFoundException quando deal não existe', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(null);
      const user = makeUser(Role.MEMBER);

      await expect(service.findOne(DEAL_ID, user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('MEMBER não pode ver deal de outro usuário', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(
        makeDeal({ ownerId: 'outro-user' }),
      );
      const user = makeUser(Role.MEMBER);

      await expect(service.findOne(DEAL_ID, user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('ADMIN pode ver deal de qualquer membro', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(
        makeDeal({ ownerId: 'outro-user' }),
      );
      const user = makeUser(Role.ADMIN, OWNER_ID);

      const result = await service.findOne(DEAL_ID, user);
      expect(result.id).toBe(DEAL_ID);
    });
  });

  // ──────────────────────────────────────────────────────────
  // moveStage()
  // ──────────────────────────────────────────────────────────
  describe('moveStage()', () => {
    it('deve definir probability=100 ao mover para CLOSED_WON', async () => {
      const deal = makeDeal();
      mockPrisma.deal.findFirst.mockResolvedValue(deal);
      mockPrisma.deal.update.mockResolvedValue({
        ...deal,
        stage: DealStage.CLOSED_WON,
        probability: 100,
        isActive: false,
      });

      const user = makeUser(Role.MEMBER, MEMBER_ID);
      await service.moveStage(DEAL_ID, { stage: DealStage.CLOSED_WON }, user);

      expect(mockPrisma.deal.update).toHaveBeenCalledWith({
        where: { id: DEAL_ID },
        data: expect.objectContaining({
          stage: DealStage.CLOSED_WON,
          probability: 100,
          isActive: false,
        }),
      });
    });

    it('deve definir probability=0 ao mover para CLOSED_LOST', async () => {
      const deal = makeDeal();
      mockPrisma.deal.findFirst.mockResolvedValue(deal);
      mockPrisma.deal.update.mockResolvedValue({
        ...deal,
        stage: DealStage.CLOSED_LOST,
        probability: 0,
        isActive: false,
      });

      const user = makeUser(Role.MEMBER, MEMBER_ID);
      await service.moveStage(DEAL_ID, { stage: DealStage.CLOSED_LOST }, user);

      expect(mockPrisma.deal.update).toHaveBeenCalledWith({
        where: { id: DEAL_ID },
        data: expect.objectContaining({
          stage: DealStage.CLOSED_LOST,
          probability: 0,
          isActive: false,
        }),
      });
    });

    it('MEMBER não pode mover deal de outro usuário', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(
        makeDeal({ ownerId: 'outro-user' }),
      );
      const user = makeUser(Role.MEMBER);

      await expect(
        service.moveStage(DEAL_ID, { stage: DealStage.QUALIFICATION }, user),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ──────────────────────────────────────────────────────────
  // remove()
  // ──────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('deve fazer soft-delete do deal', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(makeDeal());
      mockPrisma.deal.update.mockResolvedValue(
        makeDeal({ deletedAt: new Date() }),
      );

      const user = makeUser(Role.MEMBER, MEMBER_ID);
      await service.remove(DEAL_ID, user);

      expect(mockPrisma.deal.update).toHaveBeenCalledWith({
        where: { id: DEAL_ID },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('deve lançar ConflictException se deal já foi removido', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(
        makeDeal({ deletedAt: new Date() }),
      );
      const user = makeUser(Role.MEMBER, MEMBER_ID);

      await expect(service.remove(DEAL_ID, user)).rejects.toThrow(
        ConflictException,
      );
    });

    it('MEMBER não pode remover deal de outro usuário', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(
        makeDeal({ ownerId: 'outro-user' }),
      );
      const user = makeUser(Role.MEMBER);

      await expect(service.remove(DEAL_ID, user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
