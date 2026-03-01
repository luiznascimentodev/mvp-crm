import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_ENTITY_KEY } from '../decorators/audit.decorator';
import { AuditAction } from '@prisma/client';

const HTTP_METHOD_TO_ACTION: Record<string, AuditAction | undefined> = {
  POST: AuditAction.CREATE,
  PATCH: AuditAction.UPDATE,
  PUT: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entity = this.reflector.get<string>(
      AUDIT_ENTITY_KEY,
      context.getHandler(),
    );

    // Se o endpoint não tem @Audit(), passa direto
    if (!entity) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      method: string;
      params: Record<string, string>;
      ip: string;
      user?: { userId: string; tenantId: string };
      body?: unknown;
    }>();

    const methodUpper = request.method.toUpperCase();
    const action = HTTP_METHOD_TO_ACTION[methodUpper];

    // Só audita métodos de escrita reconhecidos
    if (!action) {
      return next.handle();
    }

    const user = request.user;

    // Sem usuário autenticado não registra (ex: rota pública)
    if (!user) {
      return next.handle();
    }

    const ip = (request.ip ?? '').replace(/^::ffff:/, '') || null;
    const paramId = request.params?.id ?? null;

    return next.handle().pipe(
      tap((responseBody: unknown) => {
        // Determina o entityId:
        //  - Para CREATE: id vem da resposta (body.id)
        //  - Para UPDATE/DELETE: id vem dos params da rota
        const entityId =
          action === AuditAction.CREATE
            ? ((responseBody as Record<string, string> | null)?.id ?? paramId)
            : paramId;

        if (!entityId) return;

        // Changes:
        //  - CREATE → { after: responseBody }
        //  - UPDATE → { changes: requestBody }
        //  - DELETE → null
        const changes: unknown =
          action === AuditAction.CREATE
            ? { after: responseBody }
            : action === AuditAction.UPDATE
              ? { changes: request.body ?? {} }
              : null;

        // Fire-and-forget — não bloqueia a resposta
        void this.prisma.auditLog
          .create({
            data: {
              tenantId: user.tenantId,
              userId: user.userId,
              action,
              entity,
              entityId,
              changes: changes ?? undefined,
              ip: ip ?? undefined,
            },
          })
          .catch(() => {
            // Falha silenciosa: auditoria nunca deve derrubar o fluxo principal
          });
      }),
    );
  }
}
