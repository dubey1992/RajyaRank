import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Principal } from '@rajyarank/auth';
import { submitDemoRequestSchema, type SubmitDemoRequest } from '@rajyarank/contracts';
import { Public } from '../common/decorators/public.decorator';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { DemoRequestsService } from './demo-requests.service';

@Controller()
export class DemoRequestsController {
  constructor(private readonly demoRequests: DemoRequestsService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('demo-requests')
  submit(@Body(new ZodValidationPipe(submitDemoRequestSchema)) dto: SubmitDemoRequest) {
    return this.demoRequests.submit(dto);
  }

  @Get('staff/demo-requests')
  @RequirePermission('support.manage')
  list() {
    return this.demoRequests.list();
  }

  @Patch('staff/demo-requests/:id/resolve')
  @RequirePermission('support.manage')
  resolve(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.demoRequests.resolve(p, id);
  }
}
