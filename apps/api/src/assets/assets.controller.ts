import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { completeUploadSchema, uploadIntentSchema, createEmbedAssetSchema, type UploadIntent, type CreateEmbedAsset } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { AssetsService } from './assets.service';

@Controller('staff/assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post('upload-intents')
  @RequirePermission('content.create')
  createIntent(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(uploadIntentSchema)) body: UploadIntent,
  ) {
    return this.assets.createIntent(principal, body);
  }

  @Post(':id/complete')
  @RequirePermission('content.create')
  complete(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(completeUploadSchema)) body: { checksum?: string },
  ) {
    return this.assets.complete(principal, id, body.checksum);
  }

  @Post('embed')
  @RequirePermission('content.create')
  createEmbed(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(createEmbedAssetSchema)) body: CreateEmbedAsset,
  ) {
    return this.assets.createEmbedAsset(principal, body);
  }

  @Get(':id/status')
  @RequirePermission('content.create')
  status(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.assets.status(principal, id);
  }

  @Get()
  @RequirePermission('content.create')
  listMine(@CurrentPrincipal() principal: Principal, @Query('assetType') assetType?: 'VIDEO' | 'AUDIO' | 'IMAGE' | 'DOCUMENT') {
    return this.assets.listMine(principal, assetType);
  }
}
