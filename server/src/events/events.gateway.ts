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
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: Role;
}

interface LeadMovePayload {
  leadId: string;
  status: string;
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

  constructor(private readonly jwt: JwtService) {}

  /**
   * Autentica o socket via JWT na conexao.
   * Armazena userId/tenantId em socket.data e entra na sala do tenant.
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as { token?: string }).token ??
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`[WS] Conexao rejeitada -- sem token`);
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

      // Isolar por tenant: cada tenant tem sua propria "sala"
      await client.join(payload.tenantId);
      this.logger.log(
        `[WS] ${payload.email} conectado (tenant: ${payload.tenantId})`,
      );
    } catch {
      this.logger.warn(`[WS] Token invalido -- desconectando`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data as AuthUser | undefined;
    this.logger.log(`[WS] Desconectado: ${user?.email ?? client.id}`);
  }

  /**
   * Evento: notificar movimento de lead (Kanban drag & drop).
   * Broadcast para todos no mesmo tenant.
   */
  @SubscribeMessage('lead.move')
  handleLeadMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeadMovePayload,
  ) {
    const user = client.data as AuthUser;
    // Broadcast para todos no tenant (inclusive quem enviou)
    this.server.to(user.tenantId).emit('lead.updated', {
      leadId: payload.leadId,
      status: payload.status,
      updatedBy: user.userId,
    });
  }

  /**
   * Emitir evento de lead atualizado para o tenant.
   */
  emitLeadUpdated(tenantId: string, lead: { id: string; status: string }) {
    this.server.to(tenantId).emit('lead.updated', lead);
  }

  /**
   * Emitir evento de lead criado para o tenant.
   */
  emitLeadCreated(
    tenantId: string,
    lead: { id: string; name: string; status: string },
  ) {
    this.server.to(tenantId).emit('lead.created', lead);
  }

  /**
   * Emitir evento de lead removido para o tenant.
   */
  emitLeadDeleted(tenantId: string, leadId: string) {
    this.server.to(tenantId).emit('lead.deleted', { leadId });
  }
}
