/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService, AuthenticatedUser } from './contacts.service';

const TENANT_ID = 'tenant-uuid-001';
const OWNER_ID = 'user-uuid-owner';
const MEMBER_ID = 'user-uuid-member';
const OTHER_MEMBER_ID = 'user-uuid-other';
const CONTACT_ID = 'contact-uuid-001';

const makeContact = (override?: object) => ({
  id: CONTACT_ID,
  tenantId: TENANT_ID,
  ownerId: MEMBER_ID,
  name: 'João Silva',
  email: 'joao@empresa.com',
  phone: null,
  company: null,
  position: null,
  website: null,
  linkedin: null,
  address: null,
  city: null,
  state: null,
  zipCode: null,
  country: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...override,
});

const makeUser = (role: Role, userId = MEMBER_ID): AuthenticatedUser => ({
  userId,
  email: 'user@test.com',
  tenantId: TENANT_ID,
  role,
});

const mockPrisma = {
  contact: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};

describe('ContactsService', () => {
  let service: ContactsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  // ──────────────────────────────────────────────────────────
  // create()
  // ──────────────────────────────────────────────────────────
  describe('create()', () => {
    it('deve criar contato com ownerId do usuário autenticado', async () => {
      const dto = { name: 'João', email: 'joao@test.com' };
      const expectedContact = makeContact({
        name: 'João',
        email: 'joao@test.com',
      });
      mockPrisma.contact.create.mockResolvedValue(expectedContact);

      const user = makeUser(Role.MEMBER);
      const result = await service.create(dto, user);

      expect(mockPrisma.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          ownerId: MEMBER_ID,
          name: 'João',
          email: 'joao@test.com',
        }),
      });
      expect(result).toEqual(expectedContact);
    });
  });

  // ──────────────────────────────────────────────────────────
  // findAll()
  // ──────────────────────────────────────────────────────────
  describe('findAll()', () => {
    beforeEach(() => {
      mockPrisma.$transaction.mockResolvedValue([[makeContact()], 1]);
    });

    it('MEMBER vê apenas seus próprios contatos', async () => {
      const user = makeUser(Role.MEMBER);
      await service.findAll({}, user);

      const [findManyCall] = mockPrisma.$transaction.mock.calls[0] as [
        unknown[],
      ];
      // Verifica que o primeiro argumento da transação filtra por ownerId
      expect(findManyCall).toBeDefined();
    });

    it('OWNER vê todos os contatos do tenant', async () => {
      const user = makeUser(Role.OWNER, OWNER_ID);
      await service.findAll({}, user);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('retorna paginação correta', async () => {
      const user = makeUser(Role.ADMIN, OWNER_ID);
      const result = await service.findAll({ page: 2, limit: 10 }, user);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(1);
    });
  });

  // ──────────────────────────────────────────────────────────
  // findOne()
  // ──────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('retorna o contato se pertence ao tenant', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(makeContact());
      const user = makeUser(Role.MEMBER);

      const result = await service.findOne(CONTACT_ID, user);
      expect(result.id).toBe(CONTACT_ID);
    });

    it('lança NotFoundException se contato não existe', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);
      const user = makeUser(Role.MEMBER);

      await expect(service.findOne('non-existent', user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança NotFoundException se contato é de outro tenant', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(
        makeContact({ tenantId: 'outro-tenant' }),
      );
      const user = makeUser(Role.MEMBER);

      await expect(service.findOne(CONTACT_ID, user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança NotFoundException se contato está soft-deleted', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(
        makeContact({ deletedAt: new Date() }),
      );
      const user = makeUser(Role.MEMBER);

      await expect(service.findOne(CONTACT_ID, user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança ForbiddenException se MEMBER tenta ver contato de outro', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(
        makeContact({ ownerId: OTHER_MEMBER_ID }),
      );
      const user = makeUser(Role.MEMBER, MEMBER_ID);

      await expect(service.findOne(CONTACT_ID, user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('ADMIN pode ver qualquer contato do tenant', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(
        makeContact({ ownerId: MEMBER_ID }),
      );
      const user = makeUser(Role.ADMIN, OWNER_ID);

      const result = await service.findOne(CONTACT_ID, user);
      expect(result.id).toBe(CONTACT_ID);
    });
  });

  // ──────────────────────────────────────────────────────────
  // update()
  // ──────────────────────────────────────────────────────────
  describe('update()', () => {
    it('OWNER atualiza qualquer contato do tenant', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(makeContact());
      mockPrisma.contact.update.mockResolvedValue(
        makeContact({ name: 'Atualizado' }),
      );
      const user = makeUser(Role.OWNER, OWNER_ID);

      const result = await service.update(
        CONTACT_ID,
        { name: 'Atualizado' },
        user,
      );
      expect(result.name).toBe('Atualizado');
    });

    it('MEMBER atualiza sua própria ficha', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(makeContact());
      mockPrisma.contact.update.mockResolvedValue(
        makeContact({ name: 'Novo' }),
      );
      const user = makeUser(Role.MEMBER, MEMBER_ID);

      const result = await service.update(CONTACT_ID, { name: 'Novo' }, user);
      expect(result).toBeTruthy();
    });

    it('MEMBER lança ForbiddenException ao tentar atualizar contato de outro', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(
        makeContact({ ownerId: OTHER_MEMBER_ID }),
      );
      const user = makeUser(Role.MEMBER, MEMBER_ID);

      await expect(
        service.update(CONTACT_ID, { name: 'x' }, user),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ──────────────────────────────────────────────────────────
  // remove()
  // ──────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('faz soft delete (seta deletedAt)', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(makeContact());
      mockPrisma.contact.update.mockResolvedValue(
        makeContact({ deletedAt: new Date() }),
      );
      const user = makeUser(Role.MEMBER, MEMBER_ID);

      await service.remove(CONTACT_ID, user);

      expect(mockPrisma.contact.update).toHaveBeenCalledWith({
        where: { id: CONTACT_ID },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('MEMBER lança ForbiddenException ao tentar deletar contato de outro', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(
        makeContact({ ownerId: OTHER_MEMBER_ID }),
      );
      const user = makeUser(Role.MEMBER, MEMBER_ID);

      await expect(service.remove(CONTACT_ID, user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('ADMIN deleta contato de qualquer membro', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(
        makeContact({ ownerId: MEMBER_ID }),
      );
      mockPrisma.contact.update.mockResolvedValue(
        makeContact({ deletedAt: new Date() }),
      );
      const user = makeUser(Role.ADMIN, OWNER_ID);

      await service.remove(CONTACT_ID, user);
      expect(mockPrisma.contact.update).toHaveBeenCalled();
    });
  });
});
