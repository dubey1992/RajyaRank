import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffAdminController } from './staff-admin.controller';
import { StaffAdminService } from './staff-admin.service';

@Module({
  imports: [AuthModule], // for SessionService
  controllers: [StaffAdminController],
  providers: [StaffAdminService],
})
export class StaffAdminModule {}
