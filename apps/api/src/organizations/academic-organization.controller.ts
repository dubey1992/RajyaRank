import { Controller, Get } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { RequirePermission } from '../authz/decorators';
import { OrganizationsService } from './organizations.service';

/** Academic Head: self-serve view of their own institution — org-scope
 *  enforced inside the service via principal.orgId, same pattern as
 *  AcademicBillingController. course.manage is the Head-held permission
 *  this mirrors (org.manage stays Super-Admin-only, see OrganizationsController). */
@Controller('academic/organization')
export class AcademicOrganizationController {
  constructor(private readonly orgs: OrganizationsService) {}

  // No bypassSubscriptionGate: that flag is reserved for the routes a Head
  // needs to ESCAPE an inactive subscription (KYC, browsing/buying a plan);
  // referral stats aren't part of that path, so this stays gated like any
  // other course.manage feature.
  @Get('referrals')
  @RequirePermission('course.manage')
  referrals(@CurrentPrincipal() principal: Principal) {
    return this.orgs.getReferralStats(principal);
  }
}
