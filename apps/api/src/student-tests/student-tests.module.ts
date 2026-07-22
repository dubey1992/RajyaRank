import { Module } from '@nestjs/common';
import { StudentTestsController } from './student-tests.controller';
import { StudentTestsService } from './student-tests.service';

@Module({ controllers: [StudentTestsController], providers: [StudentTestsService] })
export class StudentTestsModule {}
