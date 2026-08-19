import { Module } from '@nestjs/common';
import { PreviousYearPapersController, StudentPyqPapersController } from './previous-year-papers.controller';
import { PreviousYearPapersService } from './previous-year-papers.service';

@Module({
  controllers: [PreviousYearPapersController, StudentPyqPapersController],
  providers: [PreviousYearPapersService],
})
export class PreviousYearPapersModule {}
