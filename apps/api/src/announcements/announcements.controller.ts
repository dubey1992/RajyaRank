import { Body, Controller, Get, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { createAnnouncementSchema, type CreateAnnouncement } from '@rajyarank/contracts';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { AnnouncementsService } from './announcements.service';

@Controller('admin/announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  @RequirePermission('marketing.manage')
  list() {
    return this.announcements.list();
  }

  @Post()
  @RequirePermission('marketing.manage', { assurance: 'AAL2' })
  send(@CurrentPrincipal() principal: Principal, @Body(new ZodValidationPipe(createAnnouncementSchema)) body: CreateAnnouncement) {
    return this.announcements.send(principal, body);
  }
}
