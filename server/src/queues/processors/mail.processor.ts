import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { EnvConfig } from '../../common/env/env.validation';
import { MAIL_QUEUE } from '../queues.module';

export const SEND_INVITE_JOB = 'send-invite';

export interface SendInvitePayload {
  email: string;
  inviteLink: string;
  inviterName: string;
  tenantName: string;
  role: string;
  expiresAt: string;
}

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    super();
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: this.config.get('SMTP_PORT'),
      secure: this.config.get('SMTP_PORT') === 465,
      auth: {
        user: this.config.get('SMTP_USER', { infer: true }),
        pass: this.config.get('SMTP_PASS', { infer: true }),
      },
    });
  }

  async process(job: Job): Promise<void> {
    if (job.name === SEND_INVITE_JOB) {
      await this.handleSendInvite(job as Job<SendInvitePayload>);
      return;
    }
    this.logger.warn(`Job desconhecido recebido: ${job.name}`);
  }

  private async handleSendInvite(job: Job<SendInvitePayload>): Promise<void> {
    const { email, inviteLink, inviterName, tenantName, role, expiresAt } =
      job.data;

    this.logger.log(
      `[Job #${job.id}] Enviando convite para ${email} (tentativa ${job.attemptsMade + 1})`,
    );

    const html = this.buildInviteHtml({
      inviterName,
      tenantName,
      role,
      inviteLink,
      expiresAt,
    });

    await this.transporter.sendMail({
      from: this.config.get('SMTP_FROM', { infer: true }),
      to: email,
      subject: `${inviterName} te convidou para o ${tenantName} no Orbit CRM`,
      html,
    });

    this.logger.log(`[Job #${job.id}] Email enviado com sucesso para ${email}`);
  }

  private buildInviteHtml(params: {
    inviterName: string;
    tenantName: string;
    role: string;
    inviteLink: string;
    expiresAt: string;
  }): string {
    const { inviterName, tenantName, role, inviteLink, expiresAt } = params;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Convite para o Orbit CRM</title>
        </head>
        <body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:40px;">
          <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:8px; padding:40px;">
            <h1 style="color:#1a1a2e;">Você foi convidado! 🎉</h1>
            <p><strong>${inviterName}</strong> te convidou para fazer parte do time <strong>${tenantName}</strong> no Orbit CRM com o papel de <strong>${role}</strong>.</p>
            <p style="margin:32px 0;">
              <a
                href="${inviteLink}"
                style="background:#6366f1; color:#fff; padding:14px 28px; border-radius:6px; text-decoration:none; font-weight:bold;"
              >Aceitar Convite</a>
            </p>
            <p style="color:#666; font-size:14px;">Este convite expira em <strong>${expiresAt}</strong>.</p>
            <hr style="border:none; border-top:1px solid #eee; margin:32px 0;" />
            <p style="color:#aaa; font-size:12px;">Caso não reconheça este convite, ignore este email.</p>
          </div>
        </body>
      </html>
    `;
  }
}
