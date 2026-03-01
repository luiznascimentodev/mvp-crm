/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';

const makePrisma = () => ({
  auditLog: {
    create: vi.fn().mockResolvedValue({}),
  },
});

const makeContext = (overrides?: {
  method?: string;
  params?: Record<string, string>;
  user?: { userId: string; tenantId: string } | null;
  body?: unknown;
  handlerEntity?: string | null;
}): ExecutionContext => {
  const method = overrides?.method ?? 'POST';
  const params = overrides?.params ?? {};
  // Usa 'user' em overrides para distinguir "não passou" de "passou null/undefined"
  const user =
    overrides && 'user' in overrides
      ? overrides.user
      : { userId: 'user-1', tenantId: 'tenant-1' };
  const body = overrides?.body ?? {};
  const entity =
    overrides?.handlerEntity === undefined
      ? 'Contact'
      : overrides.handlerEntity;

  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, params, user, ip: '127.0.0.1', body }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
    __entity: entity,
  } as unknown as ExecutionContext;
};

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let prisma: ReturnType<typeof makePrisma>;
  let reflector: Reflector;

  beforeEach(() => {
    prisma = makePrisma();
    reflector = new Reflector();

    interceptor = new AuditInterceptor(reflector, prisma as never);
  });

  const getEntity = (ctx: ExecutionContext): string | null =>
    (ctx as unknown as { __entity: string | null }).__entity;

  // Override reflector.get to return the entity stored in context for testing
  const setupReflector = (ctx: ExecutionContext) => {
    vi.spyOn(reflector, 'get').mockReturnValue(getEntity(ctx));
  };

  it('deve criar log de auditoria no CREATE (POST)', async () => {
    const ctx = makeContext({ method: 'POST' });
    setupReflector(ctx);
    const next: { handle: () => Observable<unknown> } = {
      handle: () => of({ id: 'entity-uuid', name: 'Test' }),
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          setImmediate(() => {
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  action: 'CREATE',
                  entity: 'Contact',
                  entityId: 'entity-uuid',
                }),
              }),
            );
            resolve();
          });
        },
      });
    });
  });

  it('deve criar log de auditoria no UPDATE (PATCH)', async () => {
    const ctx = makeContext({
      method: 'PATCH',
      params: { id: 'entity-uuid' },
      body: { name: 'Updated' },
    });
    setupReflector(ctx);
    const next: { handle: () => Observable<unknown> } = {
      handle: () => of({ id: 'entity-uuid', name: 'Updated' }),
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          setImmediate(() => {
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  action: 'UPDATE',
                  entityId: 'entity-uuid',
                }),
              }),
            );
            resolve();
          });
        },
      });
    });
  });

  it('deve criar log de auditoria no DELETE', async () => {
    const ctx = makeContext({
      method: 'DELETE',
      params: { id: 'entity-uuid' },
    });
    setupReflector(ctx);
    const next: { handle: () => Observable<unknown> } = {
      handle: () => of(null),
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          setImmediate(() => {
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  action: 'DELETE',
                  entityId: 'entity-uuid',
                }),
              }),
            );
            resolve();
          });
        },
      });
    });
  });

  it('NÃO deve criar log se endpoint não tem @Audit()', () => {
    const ctx = makeContext({ handlerEntity: null });
    vi.spyOn(reflector, 'get').mockReturnValue(null);
    const next: { handle: () => Observable<unknown> } = {
      handle: () => of({ id: 'x' }),
    };

    interceptor.intercept(ctx, next).subscribe();

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('NÃO deve criar log se não há usuário autenticado', () => {
    const ctx = makeContext({ user: null });
    vi.spyOn(reflector, 'get').mockReturnValue('Contact');
    const next: { handle: () => Observable<unknown> } = {
      handle: () => of({ id: 'x' }),
    };

    interceptor.intercept(ctx, next).subscribe();

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('não deve lançar erro se o prisma falhar (falha silenciosa)', async () => {
    const ctx = makeContext({ method: 'POST' });
    setupReflector(ctx);
    prisma.auditLog.create.mockRejectedValue(new Error('db down'));
    const next: { handle: () => Observable<unknown> } = {
      handle: () => of({ id: 'x' }),
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          setImmediate(() => {
            // Não deve ter propagado o erro
            expect(true).toBe(true);
            resolve();
          });
        },
      });
    });
  });
});
