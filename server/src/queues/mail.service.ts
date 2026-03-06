import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EnvConfig } from '../common/env/env.validation';

export interface SendInvitePayload {
  email: string;
  inviteLink: string;
  inviterName: string;
  tenantName: string;
  role: string;
  expiresAt: string;
}

/**
 * Servico de email compartilhado.
 * Usado diretamente pelo TeamService quando Redis nao esta disponivel,
 * e pelo MailProcessor quando ha fila BullMQ configurada.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
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

  async sendInvite(payload: SendInvitePayload): Promise<void> {
    const { email, inviteLink, inviterName, tenantName, role, expiresAt } =
      payload;

    this.logger.log(`Enviando convite para ${email}`);

    await this.transporter.sendMail({
      from: this.config.get('SMTP_FROM', { infer: true }),
      to: email,
      subject: `${inviterName} te convidou para o ${tenantName} no Orbit CRM`,
      html: this.buildInviteHtml({
        inviterName,
        tenantName,
        role,
        inviteLink,
        expiresAt,
      }),
    });

    this.logger.log(`Email de convite enviado para ${email}`);
  }

  buildInviteHtml(params: {
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
            <h1 style="color:#1a1a2e;">Voc\u00ea foi convidado! \ud83c\udf89</h1>
            <p><strong>${inviterName}</strong> te convidou para fazer parte do time <strong>${tenantName}</strong> no Orbit CRM com o papel de <strong>${role}</strong>.</p>
            <p style="margin:32px 0;">
              <a
                href="${inviteLink}"
                style="background:#6366f1; color:#fff; padding:14px 28px; border-radius:6px; text-decoration:none; font-weight:bold;"
              >Aceitar Convite</a>
            </p>
            <p style="color:#666; font-size:14px;">Este convite expira em <strong>${expiresAt}</strong>.</p>
            <hr style="border:none; border-top:1px solid #eee; margin:32px 0;" />
            <p style="color:#aaa; font-size:12px;">Caso n\u00e3o reconhe\u00e7a este convite, ignore este email.</p>
          </div>
        </body>
      </html>
    `;
  }
}
