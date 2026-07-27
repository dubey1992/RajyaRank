import { Controller, Get, Param, Post } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { WishlistService } from './wishlist.service';

@Controller()
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Post('student/courses/:id/wishlist')
  toggle(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.wishlist.toggle(p, id);
  }

  @Get('student/wishlist/course-ids')
  courseIds(@CurrentPrincipal() p: Principal) {
    return this.wishlist.courseIds(p);
  }

  @Get('student/wishlist')
  list(@CurrentPrincipal() p: Principal) {
    return this.wishlist.list(p);
  }
}
