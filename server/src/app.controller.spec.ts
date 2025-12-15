import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    })
      // BEST PRACTICE: Configura o logger ANTES de compilar o módulo.
      // Isso garante silêncio absoluto desde o milissegundo zero.
      .setLogger({
        log: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {},
        verbose: () => {},
      })
      .compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return health status', () => {
      const result = appController.getHealth();
      expect(result).toHaveProperty('status', 'up');
      expect(result).toHaveProperty('service', 'Orbit CRM API');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
