import { Module } from '@nestjs/common';
import { QuestionBankModule } from '../question-bank/question-bank.module';
import { TestBuilderController } from './test-builder.controller';
import { TestBuilderService } from './test-builder.service';

@Module({ imports: [QuestionBankModule], controllers: [TestBuilderController], providers: [TestBuilderService] })
export class TestBuilderModule {}
