import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvConfig } from '../common/env/env.validation';

export const MAIL_QUEUE = 'mail-queue';

/**
 * Indica se o Redis esta configurado para uso em producao.
 * Em Vercel (sem REDIS_HOST real), o modulo e registrado como vazio
 * e o TeamService cai no envio direto via Nodemailer.
 */
export function isRedisEnabled(): boolean {
  const host = process.env.REDIS_HOST;
  // Se nao definido ou for "localhost" em producao, consideramos desabilitado
  if (!host) return false;
  if (process.env.NODE_ENV === 'production' && host === 'localhost')
    return false;
  return true;
}

@Module({})
export class QueuesModule {
  static forRoot(): DynamicModule {
    if (!isRedisEnabled()) {
      const logger = new Logger('QueuesModule');
      logger.warn(
        'Redis nao configurado — fila de emails desabilitada (envio direto via SMTP)',
      );
      return { module: QueuesModule, imports: [], exports: [] };
    }

    return {
      module: QueuesModule,
      imports: [
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService<EnvConfig, true>) => ({
            connection: {
              host: config.get('REDIS_HOST'),
              port: config.get('REDIS_PORT'),
              password:
                config.get('REDIS_PASSWORD', { infer: true }) ?? undefined,
            },
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
              removeOnComplete: { count: 100 },
              removeOnFail: { count: 200 },
            },
          }),
        }),
        BullModule.registerQueue({ name: MAIL_QUEUE }),
      ],
      exports: [BullModule],
    };
  }
}
