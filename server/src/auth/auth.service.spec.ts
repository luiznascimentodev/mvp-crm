/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password-mock'),
  verify: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };

  const mockJwtService = {
    sign: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'StrongPassword123!',
      name: 'Test User',
      tenantId: 'tenant-123',
    };

    it('should hash password with argon2 and create user', async () => {
      prisma.user.findUnique = vi.fn().mockResolvedValue(null);

      prisma.user.create = vi.fn().mockResolvedValue({
        id: 'user-123',
        email: registerDto.email,
        name: registerDto.name,
        tenantId: registerDto.tenantId,
        role: 'MEMBER',
        createdAt: new Date('2025-12-14T21:36:38.588Z'),
      });

      const result = await service.register(registerDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_email: {
            tenantId: registerDto.tenantId,
            email: registerDto.email,
          },
        },
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          name: registerDto.name,
          tenantId: registerDto.tenantId,
          passwordHash: expect.any(String),
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
      prisma.user.findUnique = vi.fn().mockResolvedValue({
        id: 'existing-user',
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return access_token for valid credentials', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'senha123456',
        tenantId: 'tenant-123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
        tenantId: 'tenant-123',
        role: 'MEMBER',
        name: 'John Doe',
      };

      prisma.user.findUnique = vi.fn().mockResolvedValue(mockUser);
      (argon2.verify as any) = vi.fn().mockResolvedValue(true);
      jwtService.sign = vi.fn().mockReturnValue('jwt-token-here');

      const result = await service.login(loginDto);

      expect(result).toEqual({ access_token: 'jwt-token-here' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_email: {
            tenantId: loginDto.tenantId,
            email: loginDto.email,
          },
        },
      });
      expect(argon2.verify).toHaveBeenCalledWith(
        mockUser.passwordHash,
        loginDto.password,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      const loginDto = {
        email: 'wrong@example.com',
        password: 'senha123456',
        tenantId: 'tenant-123',
      };

      prisma.user.findUnique = vi.fn().mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'wrong-password',
        tenantId: 'tenant-123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
        tenantId: 'tenant-123',
        role: 'MEMBER',
        name: 'John Doe',
      };

      prisma.user.findUnique = vi.fn().mockResolvedValue(mockUser);
      (argon2.verify as any) = vi.fn().mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });
});
