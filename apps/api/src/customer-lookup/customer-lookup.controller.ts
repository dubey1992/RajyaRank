import { Controller, Get, Param, Query } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { RequirePermission } from '../authz/decorators';
import { CustomerLookupService } from './customer-lookup.service';

@Controller('admin/customer-lookup')
export class CustomerLookupController {
  constructor(private readonly lookup: CustomerLookupService) {}

  @Get()
  @RequirePermission('support.manage')
  search(@CurrentPrincipal() principal: Principal, @Query('search') search?: string) {
    return this.lookup.search(principal, search ?? '');
  }

  @Get(':id')
  @RequirePermission('support.manage')
  detail(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.lookup.detail(principal, id);
  }
}
