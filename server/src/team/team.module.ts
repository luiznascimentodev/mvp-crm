import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MAIL_QUEUE } from '../queues/queues.module';
import { MailProcessor } from '../queues/processors/mail.processor';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [
    // Registra a fila no escopo deste módulo
    BullModule.registerQueue({ name: MAIL_QUEUE }),
  ],
  controllers: [TeamController],
  providers: [TeamService, MailProcessor],
  exports: [TeamService],
})
export class TeamModule {}
