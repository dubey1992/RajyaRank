import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { createMobileReleaseIntentSchema, type CreateMobileReleaseIntent } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { MobileReleasesService } from './mobile-releases.service';

@Controller('admin/mobile-releases')
export class MobileReleasesController {
  constructor(private readonly releases: MobileReleasesService) {}

  @Get()
  @RequirePermission('app.manage')
  list() {
    return this.releases.list();
  }

  @Post('upload-intents')
  @RequirePermission('app.manage')
  createIntent(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(createMobileReleaseIntentSchema)) body: CreateMobileReleaseIntent,
  ) {
    return this.releases.createUploadIntent(principal, body);
  }

  @Post(':id/complete')
  @RequirePermission('app.manage')
  complete(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.releases.complete(principal, id);
  }

  @Post(':id/publish')
  @RequirePermission('app.manage', { assurance: 'AAL2' })
  publish(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.releases.publish(principal, id);
  }

  @Post(':id/archive')
  @RequirePermission('app.manage')
  archive(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.releases.archive(principal, id);
  }
}
