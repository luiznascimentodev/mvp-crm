import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../common/enums/role.enum';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

const TENANT_ID = 'tenant-uuid-001';
const USER_ID = 'user-uuid-001';
const LEAD_ID = 'lead-uuid-001';

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

describe('EventsGateway', () => {
  let gateway: EventsGateway;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [EventsGateway, { provide: JwtService, useValue: mockJwt }],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    Reflect.set(gateway, 'server', mockServer);
  });

  describe('handleConnection()', () => {
    it('deve autenticar e conectar socket com token valido', async () => {
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

    it('deve desconectar socket com token invalido', async () => {
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

  describe('handleLeadMove()', () => {
    const user: AuthUser = {
      userId: USER_ID,
      email: 'user@test.com',
      tenantId: TENANT_ID,
      role: Role.MEMBER,
    };

    it('deve fazer broadcast de lead.updated para o tenant', () => {
      const client = makeSocket({ data: user });
      gateway.handleLeadMove(client as never, {
        leadId: LEAD_ID,
        status: 'qualified',
      });

      expect(mockServer.to).toHaveBeenCalledWith(TENANT_ID);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'lead.updated',
        expect.objectContaining({
          leadId: LEAD_ID,
          status: 'qualified',
        }),
      );
    });
  });

  describe('emit helpers', () => {
    it('emitLeadUpdated envia lead.updated para o tenant', () => {
      gateway.emitLeadUpdated(TENANT_ID, { id: LEAD_ID, status: 'won' });

      expect(mockServer.to).toHaveBeenCalledWith(TENANT_ID);
      expect(mockServer.emit).toHaveBeenCalledWith('lead.updated', {
        id: LEAD_ID,
        status: 'won',
      });
    });

    it('emitLeadCreated envia lead.created para o tenant', () => {
      const lead = { id: LEAD_ID, name: 'Ana Lead', status: 'new' };
      gateway.emitLeadCreated(TENANT_ID, lead);

      expect(mockServer.to).toHaveBeenCalledWith(TENANT_ID);
      expect(mockServer.emit).toHaveBeenCalledWith('lead.created', lead);
    });

    it('emitLeadDeleted envia lead.deleted para o tenant', () => {
      gateway.emitLeadDeleted(TENANT_ID, LEAD_ID);

      expect(mockServer.to).toHaveBeenCalledWith(TENANT_ID);
      expect(mockServer.emit).toHaveBeenCalledWith('lead.deleted', {
        leadId: LEAD_ID,
      });
    });
  });
});
