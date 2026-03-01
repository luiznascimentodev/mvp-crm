import { Test, TestingModule } from '@nestjs/testing';
import { DealStage } from '@prisma/client';
import { Role } from '../common/enums/role.enum';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { DealsService } from '../deals/deals.service';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

const TENANT_ID = 'tenant-uuid-001';
const USER_ID = 'user-uuid-001';
const DEAL_ID = 'deal-uuid-001';

// Socket mock
const makeSocket = (override?: object) => ({
  id: 'socket-abc',
  handshake: {
    auth: { token: 'valid-jwt' },
    headers: {},
  },
  data: {} as AuthUser,
  join: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  ...override,
});

// Server mock
const mockServer = {
  to: vi.fn().mockReturnThis(),
  emit: vi.fn(),
};

const mockJwt = {
  verify: vi.fn(),
};

const mockDeals = {
  moveStage: vi.fn(),
};

describe('EventsGateway', () => {
  let gateway: EventsGateway;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        { provide: JwtService, useValue: mockJwt },
        { provide: DealsService, useValue: mockDeals },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    // Injetar o servidor mock
    Reflect.set(gateway, 'server', mockServer);
  });

  // ──────────────────────────────────────────────────────────
  // handleConnection()
  // ──────────────────────────────────────────────────────────
  describe('handleConnection()', () => {
    it('deve autenticar e conectar socket com token válido', async () => {
      mockJwt.verify.mockReturnValue({
        sub: USER_ID,
        email: 'user@test.com',
        tenantId: TENANT_ID,
        role: Role.MEMBER,
      });

      const client = makeSocket();
      await gateway.handleConnection(client as never);

      expect(client.join).toHaveBeenCalledWith(TENANT_ID);
      expect(client.data).toMatchObject({
        userId: USER_ID,
        tenantId: TENANT_ID,
        role: Role.MEMBER,
      });
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('deve desconectar socket sem token', async () => {
      const client = makeSocket({ handshake: { auth: {}, headers: {} } });
      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.join).not.toHaveBeenCalled();
    });

    it('deve desconectar socket com token inválido', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      const client = makeSocket();
      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('deve aceitar token no header Authorization', async () => {
      mockJwt.verify.mockReturnValue({
        sub: USER_ID,
        email: 'user@test.com',
        tenantId: TENANT_ID,
        role: Role.MEMBER,
      });

      const client = makeSocket({
        handshake: {
          auth: {},
          headers: { authorization: `Bearer valid-token` },
        },
      });
      await gateway.handleConnection(client as never);

      expect(client.join).toHaveBeenCalledWith(TENANT_ID);
    });
  });

  // ──────────────────────────────────────────────────────────
  // handleDealMove()
  // ──────────────────────────────────────────────────────────
  describe('handleDealMove()', () => {
    const user: AuthUser = {
      userId: USER_ID,
      email: 'user@test.com',
      tenantId: TENANT_ID,
      role: Role.MEMBER,
    };

    it('deve mover deal e broadcast para o tenant', async () => {
      const updatedDeal = {
        id: DEAL_ID,
        stage: DealStage.QUALIFICATION,
        isActive: true,
        probability: 25,
      };
      mockDeals.moveStage.mockResolvedValue(updatedDeal);

      const client = makeSocket({ data: user });
      await gateway.handleDealMove(client as never, {
        dealId: DEAL_ID,
        stage: DealStage.QUALIFICATION,
      });

      expect(mockDeals.moveStage).toHaveBeenCalledWith(
        DEAL_ID,
        { stage: DealStage.QUALIFICATION },
        user,
      );
      expect(mockServer.to).toHaveBeenCalledWith(TENANT_ID);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'deal.updated',
        expect.objectContaining({
          dealId: DEAL_ID,
          stage: DealStage.QUALIFICATION,
        }),
      );
    });

    it('deve emitir deal.error para o cliente em caso de falha', async () => {
      mockDeals.moveStage.mockRejectedValue(new Error('Deal não encontrado.'));

      const client = makeSocket({ data: user });
      await gateway.handleDealMove(client as never, {
        dealId: DEAL_ID,
        stage: DealStage.CLOSED_WON,
      });

      expect(client.emit).toHaveBeenCalledWith(
        'deal.error',
        expect.objectContaining({ dealId: DEAL_ID }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────
  // emitDealCreated() / emitDealDeleted()
  // ──────────────────────────────────────────────────────────
  describe('emit helpers', () => {
    it('emitDealCreated envia deal.created para o tenant', () => {
      const deal = { id: DEAL_ID, title: 'Deal X', stage: DealStage.PROPOSAL };
      gateway.emitDealCreated(TENANT_ID, deal);

      expect(mockServer.to).toHaveBeenCalledWith(TENANT_ID);
      expect(mockServer.emit).toHaveBeenCalledWith('deal.created', deal);
    });

    it('emitDealDeleted envia deal.deleted para o tenant', () => {
      gateway.emitDealDeleted(TENANT_ID, DEAL_ID);

      expect(mockServer.to).toHaveBeenCalledWith(TENANT_ID);
      expect(mockServer.emit).toHaveBeenCalledWith('deal.deleted', {
        dealId: DEAL_ID,
      });
    });
  });
});
