import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CoursePricingController } from './course-pricing.controller';
import { CouponsController } from './coupons.controller';
import { CoursePricingService } from './course-pricing.service';

@Module({
  imports: [AuthModule], // for TokenService (course-preview tokens)
  controllers: [CoursesController, CoursePricingController, CouponsController],
  providers: [CoursesService, CoursePricingService],
  exports: [CoursesService],
})
export class CoursesModule {}
