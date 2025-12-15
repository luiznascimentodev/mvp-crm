import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'JWT_SECRET') return 'test-secret';
              return null;
            },
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return user data', () => {
    const payload = {
      sub: 'user-123',
      email: 'test@example.com',
      tenantId: 'tenant-123',
      role: 'MEMBER',
    };

    const result = strategy.validate(payload);

    expect(result).toEqual({
      userId: 'user-123',
      email: 'test@example.com',
      tenantId: 'tenant-123',
      role: 'MEMBER',
    });
  });
});
