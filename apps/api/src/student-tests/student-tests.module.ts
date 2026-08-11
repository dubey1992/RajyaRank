import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { StudentTestsController } from './student-tests.controller';
import { StudentTestsService } from './student-tests.service';

@Module({ imports: [PaymentsModule], controllers: [StudentTestsController], providers: [StudentTestsService] })
export class StudentTestsModule {}
