import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService, SendInvitePayload } from '../mail.service';
import { MAIL_QUEUE } from '../queues.module';

export const SEND_INVITE_JOB = 'send-invite';
export type { SendInvitePayload };

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === SEND_INVITE_JOB) {
      this.logger.log(
        `[Job #${job.id}] Processando convite para ${(job.data as SendInvitePayload).email} (tentativa ${job.attemptsMade + 1})`,
      );
      await this.mailService.sendInvite(job.data as SendInvitePayload);
      this.logger.log(`[Job #${job.id}] Email enviado com sucesso`);
      return;
    }
    this.logger.warn(`Job desconhecido recebido: ${job.name}`);
  }
}
