import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSendMail = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ messageId: 'msg-1' }),
);
const mockCreateTransport = vi.hoisted(() =>
  vi.fn(() => ({ sendMail: mockSendMail })),
);

vi.mock('nodemailer', () => ({
  createTransport: mockCreateTransport,
}));

import {
  MailProcessor,
  SEND_INVITE_JOB,
  SendInvitePayload,
} from '../../queues/processors/mail.processor';

const mockConfig = {
  get: vi.fn((key: string) => {
    const vars: Record<string, unknown> = {
      SMTP_HOST: 'smtp.test.com',
      SMTP_PORT: 587,
      SMTP_USER: 'user@test.com',
      SMTP_PASS: 'secret',
      SMTP_FROM: 'noreply@orbit.app',
    };
    return vars[key];
  }),
};

describe('MailProcessor', () => {
  let processor: MailProcessor;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailProcessor,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    processor = module.get<MailProcessor>(MailProcessor);
  });

  it('deve chamar createTransport com configs SMTP corretas', () => {
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.test.com',
        port: 587,
      }),
    );
  });

  describe('process()', () => {
    const buildJob = (payload: SendInvitePayload): Job<SendInvitePayload> =>
      ({
        id: 'job-1',
        name: SEND_INVITE_JOB,
        data: payload,
        attemptsMade: 0,
      }) as unknown as Job<SendInvitePayload>;

    const payload: SendInvitePayload = {
      email: 'novo@example.com',
      inviteLink: 'http://localhost:5173/accept-invite/abc123',
      inviterName: 'Alice',
      tenantName: 'Acme Corp',
      role: 'MEMBER',
      expiresAt: '07/03/2026',
    };

    it('deve enviar email com destinatário correto', async () => {
      await processor.process(buildJob(payload));

      expect(mockSendMail).toHaveBeenCalledOnce();
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: payload.email,
          from: 'noreply@orbit.app',
        }),
      );
    });

    it('deve incluir o link de convite no subject', async () => {
      await processor.process(buildJob(payload));

      const call = mockSendMail.mock.calls[0][0] as { subject: string };
      expect(call.subject).toContain('Acme Corp');
    });

    it('deve incluir o link de convite no corpo HTML', async () => {
      await processor.process(buildJob(payload));

      const call = mockSendMail.mock.calls[0][0] as { html: string };
      expect(call.html).toContain(payload.inviteLink);
    });

    it('deve propagar o erro para o BullMQ (retry)', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP timeout'));

      await expect(processor.process(buildJob(payload))).rejects.toThrow(
        'SMTP timeout',
      );
    });

    it('deve ignorar jobs com nome desconhecido sem lançar erro', async () => {
      const unknownJob = {
        id: 'x',
        name: 'unknown-job',
        data: {},
        attemptsMade: 0,
      } as unknown as Job;

      await expect(processor.process(unknownJob)).resolves.toBeUndefined();
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });
});
