import helmet from '@fastify/helmet';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import type { Queue } from 'bullmq';
import { AppModule } from './app.module';
import { MAIL_QUEUE } from './queues/queues.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const logger = new Logger('Bootstrap');

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
      },
    },
  });

  app.enableCors(); // Habilitar CORS para desenvolvimento (ajustar em produção)

  // ← REMOVEMOS app.useGlobalFilters() (vai para AppModule)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Orbit CRM API')
    .setDescription('Enterprise CRM with multi-tenancy and real-time features')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ── Inicializar NestJS (DI pronto, rotas registradas no Fastify) ──────────
  await app.init();

  // ── Bull Board Dashboard: registra o plugin Fastify DEPOIS de app.init() ──
  // (app.init() não chama fastify.ready(), então ainda podemos registrar plugins)
  try {
    const { createBullBoard } = await import('@bull-board/api');
    const { BullMQAdapter } = await import('@bull-board/api/bullMQAdapter');
    const { FastifyAdapter: BullBoardFastifyAdapter } =
      await import('@bull-board/fastify');
    const { getQueueToken } = await import('@nestjs/bullmq');

    const mailQueue = app.get<Queue>(getQueueToken(MAIL_QUEUE));

    const serverAdapter = new BullBoardFastifyAdapter();

    createBullBoard({
      queues: [new BullMQAdapter(mailQueue)],
      serverAdapter,
    });

    serverAdapter.setBasePath('/admin/queues');

    const fastifyInstance = app.getHttpAdapter().getInstance();

    await fastifyInstance.register(serverAdapter.registerPlugin(), {
      prefix: '/admin/queues',
    });

    logger.log('Bull Board registrado em /admin/queues');
  } catch (err) {
    logger.warn(`Bull Board não pôde ser inicializado: ${String(err)}`);
  }

  // ── Proteger /admin/queues: requer JWT (ADMIN ou OWNER) ──────────────────
  const fastifyInstance = app.getHttpAdapter().getInstance();

  fastifyInstance.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/admin/queues')) return;
    // Permitir recursos estáticos do bull-board
    if (/\.(js|css|ico|png|svg|woff2?|json|map)$/.test(request.url)) return;

    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return reply
        .status(401)
        .send({ message: 'Authentication required for admin area' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET not configured');
      const payload = jwt.verify(token, secret) as { role?: string };
      if (!['OWNER', 'ADMIN'].includes(payload.role ?? '')) {
        return reply.status(403).send({
          message: 'Insufficient permissions. Requires ADMIN or OWNER role.',
        });
      }
    } catch {
      return reply.status(401).send({ message: 'Invalid or expired token' });
    }
  });

  const port = process.env.PORT || 3333;
  await app.listen({ port: Number(port), host: '0.0.0.0' });

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Bull Board disponível em: http://localhost:${port}/admin/queues`);
}

void bootstrap();
