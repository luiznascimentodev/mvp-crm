import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * ThrottlerGuard condicionado: desativa o rate limiting quando NODE_ENV=test
 * para nao interferir nos testes de integracao.
 *
 * O rate-limit.spec.ts testa o ThrottlerGuard diretamente com modulo proprio.
 */
@Injectable()
export class ConditionalThrottlerGuard extends ThrottlerGuard {
  protected override shouldSkip(): Promise<boolean> {
    return Promise.resolve(process.env.NODE_ENV === 'test');
  }
}
