import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/** Controlador mínimo para testar rate limiting */
@Controller('probe')
class ProbeController {
  @Get()
  ping() {
    return { ok: true };
  }
}

/** Módulo isolado com ThrottlerGuard real (sem NODE_ENV skip) */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 3, // limite baixo para facilitar o teste
      },
    ]),
  ],
  controllers: [ProbeController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class RateLimitTestModule {}

describe('Security: Rate Limiting', () => {
  let application: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RateLimitTestModule],
    }).compile();

    application = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await application.init();
    await application.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await application.close();
  });

  it('Primeiras 3 requisições são aceitas (200)', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await application.inject({ method: 'GET', url: '/probe' });
      expect(res.statusCode).toBe(200);
    }
  });

  it('4ª requisição exceede o limite e retorna 429', async () => {
    const res = await application.inject({ method: 'GET', url: '/probe' });
    expect(res.statusCode).toBe(429);
  });
});
