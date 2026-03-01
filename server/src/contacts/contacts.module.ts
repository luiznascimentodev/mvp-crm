import { Module } from '@nestjs/common';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  controllers: [ContactsController],
  providers: [ContactsService, AuditInterceptor],
  exports: [ContactsService],
})
export class ContactsModule {}
