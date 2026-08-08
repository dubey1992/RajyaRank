import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import {
  confirmKycDocumentUploadSchema,
  kycDocumentUploadIntentSchema,
  rejectKycSchema,
  submitKycSchema,
  type ConfirmKycDocumentUpload,
  type KycDocumentUploadIntent,
  type RejectKyc,
  type SubmitKyc,
} from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { SettlementsService } from './settlements.service';

/** Super Admin: cross-institution settlement/payout oversight. org.manage —
 *  same platform-oversight boundary as institution billing. */
@Controller('admin/settlements')
export class SettlementsAdminController {
  constructor(private readonly settlements: SettlementsService) {}

  @Get('summary')
  @RequirePermission('org.manage')
  summary() {
    return this.settlements.superSummary();
  }

  @Get('linked-accounts')
  @RequirePermission('org.manage')
  listLinkedAccounts() {
    return this.settlements.listLinkedAccounts();
  }

  @Post('linked-accounts/:orgId/kyc')
  @RequirePermission('org.manage', { assurance: 'AAL2' })
  verifyKyc(@CurrentPrincipal() principal: Principal, @Param('orgId') orgId: string) {
    return this.settlements.verifyKyc(principal, orgId);
  }

  @Post('linked-accounts/:orgId/kyc/reject')
  @RequirePermission('org.manage', { assurance: 'AAL2' })
  rejectKyc(
    @CurrentPrincipal() principal: Principal,
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(rejectKycSchema)) body: RejectKyc,
  ) {
    return this.settlements.rejectKyc(principal, orgId, body.reason);
  }

  /** The institution's submitted KYC packet (masked PAN/bank account) — what
   *  Super Admin actually reviews before clicking Verify KYC above. */
  @Get('linked-accounts/:orgId/kyc-submission')
  @RequirePermission('org.manage')
  getKycSubmission(@Param('orgId') orgId: string) {
    return this.settlements.getKycSubmissionForOrg(orgId);
  }

  /** Returns the presigned URL as JSON rather than a 302 — the browser must
   *  fetch the storage object as a separate, uncredentialed request (see
   *  apiDownloadPresigned in apps/admin/lib/api.ts): if `fetch()` is left to
   *  auto-follow a redirect, it carries this call's cookies over to the S3
   *  origin too, which a wildcard-CORS bucket rejects outright for a
   *  credentialed cross-origin request. */
  @Get('kyc-documents/:documentId')
  @RequirePermission('org.manage')
  async downloadKycDocument(@Param('documentId') documentId: string) {
    const url = await this.settlements.getKycDocumentDownloadUrl(documentId);
    return { url };
  }

  @Get('transfers')
  @RequirePermission('org.manage')
  listTransfers() {
    return this.settlements.listTransfers();
  }

  /** Backs the "View Institute" page's earnings summary — same computation
   *  as the Academic Head's own /academic/settlements/earnings, keyed by an
   *  explicit orgId instead of the caller's own. */
  @Get('institutions/:orgId/earnings')
  @RequirePermission('org.manage')
  institutionEarningsForOrg(@Param('orgId') orgId: string) {
    return this.settlements.institutionEarningsForOrg(orgId);
  }

  /** Re-attempt an ON_HOLD transfer's Razorpay Route call — e.g. once Route
   *  is enabled on the merchant account, or after a transient provider error. */
  @Post('transfers/:id/retry')
  @RequirePermission('org.manage', { assurance: 'AAL2' })
  retryTransfer(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.settlements.retryTransfer(principal, id);
  }
}

/** Academic Head: their own institution's earnings only — org-scope is
 *  enforced inside the service via principal.orgId, which also naturally
 *  excludes course.manage holders with no institution (e.g. Content Admin). */
@Controller('academic/settlements')
export class SettlementsAcademicController {
  constructor(private readonly settlements: SettlementsService) {}

  // Bypasses the subscription gate like the KYC routes above: this is the
  // institution's OWN student-sales revenue via Razorpay Route, orthogonal
  // to whether they currently pay RajyaRank's platform subscription — an org
  // with a lapsed subscription still needs to see and get paid out on money
  // already earned, and this is also where the KYC submission form lives
  // (/admin/earnings), which must render even before any subscription exists.
  @Get('earnings')
  @RequirePermission('course.manage', { bypassSubscriptionGate: true })
  earnings(@CurrentPrincipal() principal: Principal) {
    return this.settlements.institutionEarnings(principal);
  }

  // KYC routes below bypass the subscription gate deliberately: a Head whose
  // institution has never been subscribed (or has lapsed) must still be able
  // to view/submit KYC, since that's a prerequisite for buying a plan
  // through academic/billing — gating it behind an active subscription made
  // both unreachable for exactly the orgs that need them.
  @Get('kyc')
  @RequirePermission('course.manage', { bypassSubscriptionGate: true })
  getMyKyc(@CurrentPrincipal() principal: Principal) {
    return this.settlements.getMyKycSubmission(principal);
  }

  @Post('kyc')
  @RequirePermission('course.manage', { bypassSubscriptionGate: true })
  submitKyc(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(submitKycSchema)) body: SubmitKyc,
  ) {
    return this.settlements.submitKyc(principal, body);
  }

  @Post('kyc/documents')
  @RequirePermission('course.manage', { bypassSubscriptionGate: true })
  createKycDocumentUploadIntent(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(kycDocumentUploadIntentSchema)) body: KycDocumentUploadIntent,
  ) {
    return this.settlements.createKycDocumentUploadIntent(principal, body);
  }

  @Post('kyc/documents/confirm')
  @RequirePermission('course.manage', { bypassSubscriptionGate: true })
  confirmKycDocumentUpload(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(confirmKycDocumentUploadSchema)) body: ConfirmKycDocumentUpload,
  ) {
    return this.settlements.confirmKycDocumentUpload(principal, body);
  }
}
