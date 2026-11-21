import { Controller, Get, Param } from '@nestjs/common';
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

  /** Super Admin revenue dashboard — combined student + institution direct
   *  revenue, trends, plan mix, and payments needing attention. */
  @Get('revenue-overview')
  @RequirePermission('payment.manage')
  revenueOverview() {
    return this.analytics.revenueOverview();
  }

  /** Academic Head dashboard — throws (403) if the caller has no orgId. */
  @Get('institution-overview')
  @RequirePermission('user.manage')
  institutionOverview(@CurrentPrincipal() principal: Principal) {
    return this.analytics.institutionOverview(principal);
  }

  /** Institute Intervention Radar — throws (403) if the caller has no orgId,
   *  same gate as institution-overview. */
  @Get('at-risk-students')
  @RequirePermission('user.manage')
  atRiskStudents(@CurrentPrincipal() principal: Principal) {
    return this.analytics.atRiskStudents(principal);
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

  // ── Performance Reports — Super Admin (platform-wide) / Academic Head
  // (their own org), branching internally on principal.orgId exactly like
  // contentPipeline above. ──────────────────────────────────────────────

  @Get('performance-overview')
  @RequirePermission('reports.view')
  performanceOverview(@CurrentPrincipal() principal: Principal) {
    return this.analytics.performanceOverview(principal);
  }

  @Get('performance-trend')
  @RequirePermission('reports.view')
  performanceTrend(@CurrentPrincipal() principal: Principal) {
    return this.analytics.performanceTrend(principal);
  }

  @Get('performance-by-subject')
  @RequirePermission('reports.view')
  performanceBySubject(@CurrentPrincipal() principal: Principal) {
    return this.analytics.performanceBySubject(principal);
  }

  /** Super Admin only — the service throws if the caller has an orgId. */
  @Get('institution-leaderboard')
  @RequirePermission('reports.view')
  institutionLeaderboard(@CurrentPrincipal() principal: Principal) {
    return this.analytics.institutionLeaderboard(principal);
  }

  /** Academic Head only — the service throws if the caller has no orgId. */
  @Get('student-leaderboard')
  @RequirePermission('reports.view')
  studentLeaderboard(@CurrentPrincipal() principal: Principal) {
    return this.analytics.studentLeaderboard(principal);
  }

  @Get('student-performance/:studentId')
  @RequirePermission('reports.view')
  studentPerformanceDetail(@CurrentPrincipal() principal: Principal, @Param('studentId') studentId: string) {
    return this.analytics.studentPerformanceDetail(principal, studentId);
  }

  @Get('live-class-engagement')
  @RequirePermission('reports.view')
  liveClassEngagement(@CurrentPrincipal() principal: Principal) {
    return this.analytics.liveClassEngagement(principal);
  }
}
