import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Principal } from '@rajyarank/auth';
import { submitContactSchema, type SubmitContact } from '@rajyarank/contracts';
import { Public } from '../common/decorators/public.decorator';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { ContactService } from './contact.service';

@Controller()
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('contact')
  submit(@Body(new ZodValidationPipe(submitContactSchema)) dto: SubmitContact) {
    return this.contact.submit(dto);
  }

  @Get('staff/contact-messages')
  @RequirePermission('support.manage')
  list() {
    return this.contact.list();
  }

  @Patch('staff/contact-messages/:id/resolve')
  @RequirePermission('support.manage')
  resolve(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.contact.resolve(p, id);
  }
}
