import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import {
  attachAssetSchema,
  commentSchema,
  editVersionSchema,
  rejectSchema,
  requestCorrectionSchema,
  scheduleSchema,
  unpublishSchema,
  type AttachAsset,
  type EditVersion,
} from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { ContentWorkflowService } from './content-workflow.service';

@Controller('staff/content')
export class ContentWorkflowController {
  constructor(private readonly wf: ContentWorkflowService) {}

  // ── Queues / listings ──
  @Get('review-queue')
  @RequirePermission('content.review')
  reviewQueue(@CurrentPrincipal() p: Principal) {
    return this.wf.reviewQueue(p);
  }

  // Authenticated-only; the service authorizes (content managers see all,
  // reviewers see their assigned scope).
  @Get('board')
  board(@CurrentPrincipal() p: Principal) {
    return this.wf.board(p);
  }

  @Get('mine')
  @RequirePermission('content.create')
  mine(@CurrentPrincipal() p: Principal) {
    return this.wf.myContent(p);
  }

  @Get('versions/:id/timeline')
  @RequirePermission('content.review')
  timeline(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.wf.timeline(p, id);
  }

  // Authenticated-only; the service authorizes (any of create/edit/review/
  // publish) so authors, content managers, and reviewers can all inspect
  // what they're submitting/approving/publishing before acting on it.
  @Get('versions/:id/preview')
  preview(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.wf.preview(p, id);
  }

  // ── Owner / teacher ──
  @Post('versions/:id/edit')
  @RequirePermission('content.edit_own')
  edit(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(editVersionSchema)) body: EditVersion,
  ) {
    return this.wf.editVersion(p, id, body);
  }

  @Post('versions/:id/assets')
  @RequirePermission('content.edit_own')
  attach(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(attachAssetSchema)) body: AttachAsset,
  ) {
    return this.wf.attachAsset(p, id, body);
  }

  @Post('versions/:id/submit')
  @RequirePermission('content.submit_review')
  submit(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.wf.submit(p, id);
  }

  @Post('lessons/:lessonId/new-version')
  @RequirePermission('content.edit_own')
  newVersion(@CurrentPrincipal() p: Principal, @Param('lessonId') lessonId: string) {
    return this.wf.createNewVersion(p, lessonId);
  }

  // ── Reviewer ──
  @Post('versions/:id/start-review')
  @RequirePermission('content.review')
  startReview(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.wf.startReview(p, id);
  }

  @Post('versions/:id/comment')
  @RequirePermission('content.review')
  comment(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(commentSchema)) body: { body: string },
  ) {
    return this.wf.comment(p, id, body.body);
  }

  @Post('versions/:id/request-correction')
  @RequirePermission('content.review')
  requestCorrection(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(requestCorrectionSchema)) body: { body: string },
  ) {
    return this.wf.requestCorrection(p, id, body.body);
  }

  @Post('versions/:id/approve')
  @RequirePermission('content.approve')
  approve(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.wf.approve(p, id);
  }

  @Post('versions/:id/reject')
  @RequirePermission('content.approve')
  reject(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectSchema)) body: { reason: string },
  ) {
    return this.wf.reject(p, id, body.reason);
  }

  // ── Academic Head / Academic Reviewer (publishing; MFA / AAL2) ──
  @Post('versions/:id/schedule')
  @RequirePermission('content.publish', { assurance: 'AAL2' })
  schedule(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(scheduleSchema)) body: { publishAt: string },
  ) {
    return this.wf.schedule(p, id, body.publishAt);
  }

  @Post('versions/:id/publish')
  @RequirePermission('content.publish', { assurance: 'AAL2' })
  publish(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.wf.publish(p, id);
  }

  @Post('versions/:id/unpublish')
  @RequirePermission('content.unpublish', { assurance: 'AAL2' })
  unpublish(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(unpublishSchema)) body: { reason: string },
  ) {
    return this.wf.unpublish(p, id, body.reason);
  }

  @Post('versions/:id/archive')
  @RequirePermission('content.archive', { assurance: 'AAL2' })
  archive(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.wf.archive(p, id);
  }
}
