import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  await app.register(helmet);
  app.enableCors();

  const httpAdapter = app.get(HttpAdapterHost);
  const logger = app.get(Logger);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter, logger));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');

  await app.listen(port!, '0.0.0.0');

  logger.log(` Server running on http://0.0.0.0:${port}`);
}

void bootstrap();
