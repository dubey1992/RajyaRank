import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { StudyPlanService } from './study-plan.service';
import { ReadinessService } from './readiness.service';
import { MistakeDnaService } from './mistake-dna.service';
import { PersonalQuizzesService } from './personal-quizzes.service';
import { StudentPapersService } from './student-papers.service';
import { PaymentsModule } from '../payments/payments.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [PaymentsModule, AssetsModule], // PaymentsModule: EntitlementService; AssetsModule: reused upload-intent/complete flow
  controllers: [StudentController],
  providers: [StudentService, StudyPlanService, ReadinessService, MistakeDnaService, PersonalQuizzesService, StudentPapersService],
})
export class StudentModule {}
