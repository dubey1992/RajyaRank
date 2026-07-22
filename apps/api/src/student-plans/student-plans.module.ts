import { Module } from '@nestjs/common';
import { StudentPlansController } from './student-plans.controller';
import { StudentPlansService } from './student-plans.service';

@Module({
  controllers: [StudentPlansController],
  providers: [StudentPlansService],
})
export class StudentPlansModule {}
