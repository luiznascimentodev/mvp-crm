import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvConfig } from '../common/env/env.validation';

export const MAIL_QUEUE = 'mail-queue';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD', { infer: true }) ?? undefined,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 200 },
        },
      }),
    }),
    BullModule.registerQueue({ name: MAIL_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
