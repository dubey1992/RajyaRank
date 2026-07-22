import { Controller, Get } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { RequirePermission } from '../authz/decorators';
import { AnalyticsService } from './analytics.service';

@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  @RequirePermission('audit.view')
  overview() {
    return this.analytics.overview();
  }

  /** Academic Head dashboard — throws (403) if the caller has no orgId. */
  @Get('institution-overview')
  @RequirePermission('user.manage')
  institutionOverview(@CurrentPrincipal() principal: Principal) {
    return this.analytics.institutionOverview(principal);
  }

  /** Content Admin / Academic Head dashboard — org-scoped automatically. */
  @Get('content-pipeline')
  @RequirePermission('content.edit_all')
  contentPipeline(@CurrentPrincipal() principal: Principal) {
    return this.analytics.contentPipeline(principal);
  }

  /** Academic Reviewer dashboard. */
  @Get('review-overview')
  @RequirePermission('content.review')
  reviewOverview(@CurrentPrincipal() principal: Principal) {
    return this.analytics.reviewOverview(principal);
  }
}
