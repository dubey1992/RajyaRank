import { Module } from '@nestjs/common';
import { CurrentAffairsController } from './current-affairs.controller';
import { CurrentAffairsService } from './current-affairs.service';

@Module({
  controllers: [CurrentAffairsController],
  providers: [CurrentAffairsService],
})
export class CurrentAffairsModule {}
