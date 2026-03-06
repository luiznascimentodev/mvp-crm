import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ConditionalThrottlerGuard } from './common/guards/conditional-throttler.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envSchema } from './common/env/env.validation';
import { AuthModule } from './auth/auth.module';
import { ContactsModule } from './contacts/contacts.module';
import { StorageModule } from './storage/storage.module';
import { EventsModule } from './events/events.module';
import { QueuesModule } from './queues/queues.module';
import { TeamModule } from './team/team.module';
import { PrismaModule } from './prisma/prisma.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LeadsModule } from './leads/leads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => {
        const result = envSchema.safeParse(config);
        if (!result.success) {
          throw new Error(
            `Environment validation failed: ${result.error.issues[0].message}`,
          );
        }
        return result.data;
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: false,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
        autoLogging: true,
        customProps: () => ({
          context: 'HTTP',
        }),
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 300,
      },
      {
        name: 'auth',
        ttl: 900_000,
        limit: 5,
      },
    ]),
    PrismaModule,
    AuthModule,
    ContactsModule,
    StorageModule,
    EventsModule,
    QueuesModule.forRoot(),
    TeamModule,
    DashboardModule,
    LeadsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ConditionalThrottlerGuard },
  ],
})
export class AppModule {}
