import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module';
import { OrganizationsController } from './organizations.controller';
import { AcademicOrganizationController } from './academic-organization.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [InvitationsModule],
  controllers: [OrganizationsController, AcademicOrganizationController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
