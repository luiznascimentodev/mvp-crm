import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { DealsService } from '../deals/deals.service';
import { DealStage } from '@prisma/client';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: Role;
}

interface MoveStagePayload {
  dealId: string;
  stage: DealStage;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly deals: DealsService,
  ) {}

  /**
   * Autentica o socket via JWT na conexão.
   * Armazena userId/tenantId em socket.data e entra na sala do tenant.
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as { token?: string }).token ??
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`[WS] Conexão rejeitada — sem token`);
        client.disconnect(true);
        return;
      }

      const payload = this.jwt.verify<JwtPayload>(token);
      client.data = {
        userId: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        role: payload.role,
      } satisfies AuthUser;

      // Isolar por tenant: cada tenant tem sua própria "sala"
      await client.join(payload.tenantId);
      this.logger.log(
        `[WS] ${payload.email} conectado (tenant: ${payload.tenantId})`,
      );
    } catch {
      this.logger.warn(`[WS] Token inválido — desconectando`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data as AuthUser | undefined;
    this.logger.log(`[WS] Desconectado: ${user?.email ?? client.id}`);
  }

  /**
   * Evento: mover deal de stage (Kanban drag & drop).
   * Broadcast para todos no mesmo tenant.
   */
  @SubscribeMessage('deal.move')
  async handleDealMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MoveStagePayload,
  ) {
    const user = client.data as AuthUser;

    try {
      const updated = await this.deals.moveStage(
        payload.dealId,
        { stage: payload.stage },
        user,
      );

      // Broadcast para todos no tenant (inclusive quem enviou)
      this.server.to(user.tenantId).emit('deal.updated', {
        dealId: updated.id,
        stage: updated.stage,
        isActive: updated.isActive,
        updatedBy: user.userId,
      });
    } catch (err) {
      // Envia erro só para quem tentou mover
      client.emit('deal.error', {
        dealId: payload.dealId,
        message: (err as Error).message,
      });
    }
  }

  /**
   * Emitir evento de deal criado para o tenant (chamado pelo DealsService).
   */
  emitDealCreated(
    tenantId: string,
    deal: { id: string; title: string; stage: DealStage },
  ) {
    this.server.to(tenantId).emit('deal.created', deal);
  }

  /**
   * Emitir evento de deal removido para o tenant.
   */
  emitDealDeleted(tenantId: string, dealId: string) {
    this.server.to(tenantId).emit('deal.deleted', { dealId });
  }
}
