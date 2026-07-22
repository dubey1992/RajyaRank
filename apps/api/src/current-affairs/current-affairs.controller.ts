import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import {
  requestCorrectionSchema,
  unpublishSchema,
  upsertCurrentAffairSchema,
} from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { CurrentAffairsService } from './current-affairs.service';

@Controller('admin/current-affairs')
export class CurrentAffairsController {
  constructor(private readonly service: CurrentAffairsService) {}

  // Reachable by makers (content.create) or checkers (content.review) — no
  // single permission code covers both, so this is checked in-service.
  @Get()
  list(@CurrentPrincipal() p: Principal) {
    return this.service.list(p);
  }

  @Post()
  @RequirePermission('content.create')
  create(@CurrentPrincipal() p: Principal, @Body(new ZodValidationPipe(upsertCurrentAffairSchema)) dto: any) {
    return this.service.create(p, dto);
  }

  @Patch(':id')
  @RequirePermission('content.create')
  update(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertCurrentAffairSchema.partial())) dto: any,
  ) {
    return this.service.update(p, id, dto);
  }

  @Post(':id/submit')
  @RequirePermission('content.create')
  submit(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.service.submit(p, id);
  }

  @Post(':id/request-correction')
  @RequirePermission('content.review')
  requestCorrection(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(requestCorrectionSchema)) dto: { body: string },
  ) {
    return this.service.requestCorrection(p, id, dto.body);
  }

  @Post(':id/publish')
  @RequirePermission('content.publish')
  publish(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.service.publish(p, id);
  }

  @Post(':id/unpublish')
  @RequirePermission('content.publish')
  unpublish(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(unpublishSchema)) dto: { reason: string },
  ) {
    return this.service.unpublish(p, id, dto.reason);
  }

  @Post(':id/archive')
  @RequirePermission('content.publish')
  archive(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.service.archive(p, id);
  }
}
