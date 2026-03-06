import { Module } from '@nestjs/common';
import { MailService } from '../queues/mail.service';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  controllers: [TeamController],
  providers: [TeamService, MailService],
  exports: [TeamService],
})
export class TeamModule {}
