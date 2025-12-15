import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';

import { ModuleMetadata } from '@nestjs/common';

export async function createTestApplication(
  overrides?: ModuleMetadata,
): Promise<NestFastifyApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule, ...(overrides?.imports || [])],
    controllers: [...(overrides?.controllers || [])],
    providers: [...(overrides?.providers || [])],
  }).compile();

  const application =
    moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

  application.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await application.init();
  await application.getHttpAdapter().getInstance().ready();

  return application;
}
