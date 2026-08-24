import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsController } from './organizations.controller';
import { AcademicOrganizationController } from './academic-organization.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [InvitationsModule, AuthModule], // AuthModule for SessionService (org deletion logs out its staff)
  controllers: [OrganizationsController, AcademicOrganizationController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
