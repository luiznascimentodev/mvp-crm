import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../enums/role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const mockContext = (userRole?: Role) =>
    ({
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: userRole },
        }),
      }),
    }) as unknown as ExecutionContext;

  it('should allow access if no roles are defined', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = mockContext(Role.MEMBER);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = mockContext(Role.ADMIN);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if user does not have required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = mockContext(Role.MEMBER);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should deny access if user has no role/not logged in', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MEMBER]);
    const context = mockContext(undefined);
    expect(guard.canActivate(context)).toBe(false);
  });
});
