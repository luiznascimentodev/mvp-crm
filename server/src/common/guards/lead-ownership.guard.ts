import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../enums/role.enum';

interface AuthenticatedRequest {
  user?: { role: Role; userId: string };
  params: { id?: string };
}

@Injectable()
export class LeadOwnershipGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const params = request.params;
    const leadId = params.id;

    if (!user) {
      return false; // Usuário não autenticado
    }

    // Acesso total para ADMIN e OWNER
    if (user.role === Role.ADMIN || user.role === Role.OWNER) {
      return true;
    }

    // Regras para MEMBER
    if (user.role === Role.MEMBER) {
      if (!leadId) {
        // Se a rota não tem ID (ex: create, list), o guard não se aplica ou
        // deveria ser tratado de outra forma. Aqui vamos permitir e deixar outros filtros cuidarem (ex: no service)
        // Mas o correto para 'ownership' geralmente é validar quando tem ID.
        // Se a intenção é validar operações em item específico, precisamos do ID.
        return true;
      }

      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: { ownerId: true },
      });

      if (!lead) {
        // Se o lead não existe, geralmente retorna 404, mas guards retornam 403/false.
        // Vamos permitir passar aqui para que o controller/service lance o 404 correto,
        // OU retornar false se quisermos ocultar a existência.
        // Padrão seguro: Retornar true e deixar o service falhar com 404,
        // POIS se o lead não existe, não viola propriedade de ninguém.
        return true;
      }

      if (lead.ownerId !== user.userId) {
        throw new ForbiddenException(
          'You do not have permission to access this lead',
        );
      }

      return true;
    }

    return false; // Bloqueia outros papéis não mapeados
  }
}
