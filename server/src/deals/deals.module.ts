import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';

@Module({
  controllers: [DealsController],
  providers: [DealsService, AuditInterceptor],
  exports: [DealsService],
})
export class DealsModule {}
