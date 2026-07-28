import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { StudyPlanService } from './study-plan.service';
import { ReadinessService } from './readiness.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule], // for EntitlementService (content access gate)
  controllers: [StudentController],
  providers: [StudentService, StudyPlanService, ReadinessService],
})
export class StudentModule {}
