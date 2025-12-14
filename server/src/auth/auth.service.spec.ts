/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'StrongPassword123!',
      name: 'Test User',
      tenantId: 'tenant-123',
    };

    it('should hash password with argon2 and create user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // ✅ CORREÇÃO: Mock retorna APENAS campos do select
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-123',
        email: registerDto.email,
        name: registerDto.name,
        tenantId: registerDto.tenantId,
        role: 'MEMBER',
        createdAt: new Date('2025-12-14T21:36:38.588Z'),
        // ← NÃO inclui passwordHash, updatedAt, deletedAt
      });

      // Act

      const result = await service.register(registerDto);

      // Assert: Verificar chamada ao findUnique
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_email: {
            tenantId: registerDto.tenantId,
            email: registerDto.email,
          },
        },
      });

      // Assert: Verificar chamada ao create
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          name: registerDto.name,
          tenantId: registerDto.tenantId,
          passwordHash: expect.any(String), // Hash Argon2
          role: 'MEMBER',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true,
          createdAt: true,
        },
      });

      // Assert: Verificar retorno (SEM passwordHash)

      expect(result).toEqual({
        id: 'user-123',
        email: registerDto.email,
        name: registerDto.name,
        role: 'MEMBER',
        tenantId: registerDto.tenantId,
        createdAt: expect.any(Date),
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: registerDto.email,
      });

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );

      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });
});
