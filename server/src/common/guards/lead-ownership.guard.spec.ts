import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../enums/role.enum';
import { LeadOwnershipGuard } from './lead-ownership.guard';

describe('LeadOwnershipGuard', () => {
  let guard: LeadOwnershipGuard;
  let prismaService: PrismaService;

  const mockPrismaService = {
    lead: {
      findUnique: vi.fn(),
    },
  };

  beforeEach(() => {
    prismaService = mockPrismaService as unknown as PrismaService;
    guard = new LeadOwnershipGuard(prismaService);
    vi.clearAllMocks();
  });

  const mockContext = (userRole: Role, userId: string, params: any = {}) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: userRole, userId },
          params,
        }),
      }),
    }) as unknown as ExecutionContext;

  it('should allow access to OWNER', async () => {
    const context = mockContext(Role.OWNER, 'owner-id');
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow access to ADMIN', async () => {
    const context = mockContext(Role.ADMIN, 'admin-id');
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow access to MEMBER if they own the lead', async () => {
    const context = mockContext(Role.MEMBER, 'user-id', { id: 'lead-id' });
    mockPrismaService.lead.findUnique.mockResolvedValue({ ownerId: 'user-id' });

    expect(await guard.canActivate(context)).toBe(true);
    expect(mockPrismaService.lead.findUnique).toHaveBeenCalledWith({
      where: { id: 'lead-id' },
      select: { ownerId: true },
    });
  });

  it('should deny access to MEMBER if they do NOT own the lead', async () => {
    const context = mockContext(Role.MEMBER, 'user-id', { id: 'lead-id' });
    mockPrismaService.lead.findUnique.mockResolvedValue({
      ownerId: 'other-user',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow passthrough if lead does not exist (let service handle 404)', async () => {
    const context = mockContext(Role.MEMBER, 'user-id', { id: 'non-existent' });
    mockPrismaService.lead.findUnique.mockResolvedValue(null);

    expect(await guard.canActivate(context)).toBe(true);
  });
});
