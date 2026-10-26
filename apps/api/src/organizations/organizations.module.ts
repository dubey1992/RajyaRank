import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { OrganizationsController } from './organizations.controller';
import { AcademicOrganizationController } from './academic-organization.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  // AuthModule for SessionService (org deletion logs out its staff);
  // BillingModule for granting a demo org its lifetime subscription.
  imports: [InvitationsModule, AuthModule, BillingModule],
  controllers: [OrganizationsController, AcademicOrganizationController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
