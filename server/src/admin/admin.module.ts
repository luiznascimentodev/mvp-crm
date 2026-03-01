import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { MAIL_QUEUE } from '../queues/queues.module';

/**
 * AdminModule — Dashboard do BullMQ disponível em /admin/queues.
 *
 * O acesso é protegido por um Fastify preHandler hook configurado em main.ts
 * que valida o JWT Bearer token e exige role ADMIN ou OWNER.
 */
@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: FastifyAdapter,
    }),
    BullBoardModule.forFeature({
      name: MAIL_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
})
export class AdminModule {}
