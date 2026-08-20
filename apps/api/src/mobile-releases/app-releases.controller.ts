import { Controller, Get, Param } from '@nestjs/common';
import { mobileAppPlatformSchema } from '@rajyarank/contracts';
import { Public } from '../common/decorators/public.decorator';
import { AppError } from '../common/errors/app-error';
import { MobileReleasesService } from './mobile-releases.service';

/** Public, unauthenticated — powers the "Download the app" section on the
 *  marketing page. Separate from the admin/ controller above, which manages
 *  releases and requires app.manage. */
@Controller('app-releases')
export class AppReleasesController {
  constructor(private readonly releases: MobileReleasesService) {}

  @Get(':platform/latest')
  @Public()
  async latest(@Param('platform') platform: string) {
    const parsed = mobileAppPlatformSchema.safeParse(platform.toUpperCase());
    if (!parsed.success) throw AppError.notFound('Unknown platform.');
    return this.releases.latestPublished(parsed.data);
  }
}
