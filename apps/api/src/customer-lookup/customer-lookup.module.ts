import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StudentsModule } from '../students/students.module';
import { CustomerLookupController } from './customer-lookup.controller';
import { CustomerLookupService } from './customer-lookup.service';

@Module({
  imports: [AuthModule, StudentsModule], // for SessionService, StudentsService
  controllers: [CustomerLookupController],
  providers: [CustomerLookupService],
})
export class CustomerLookupModule {}
