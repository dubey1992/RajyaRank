import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import { upsertBlogPostSchema, type UpsertBlogPost } from '@rajyarank/contracts';
import { Public } from '../common/decorators/public.decorator';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../authz/decorators';
import { BlogService } from './blog.service';

/** Public, unauthenticated reads for the promotion/SEO blog. */
@Controller()
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Public()
  @Get('blog')
  list(@Query('category') category?: string) {
    return this.blog.publicList(category);
  }

  @Public()
  @Get('blog/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.blog.publicBySlug(slug);
  }
}

/** Admin CRUD, gated by marketing.manage — same permission as Testimonials/
 *  FAQs/Announcements, since blog copy is marketing-owned rather than
 *  academic content needing an Academic Head/Reviewer sign-off. */
@Controller('admin/blog')
export class BlogAdminController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  @RequirePermission('marketing.manage')
  adminList() {
    return this.blog.adminList();
  }

  @Get(':id')
  @RequirePermission('marketing.manage')
  adminGet(@Param('id') id: string) {
    return this.blog.adminGet(id);
  }

  @Post()
  @RequirePermission('marketing.manage')
  create(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(upsertBlogPostSchema)) body: UpsertBlogPost,
  ) {
    return this.blog.create(principal.userId, body);
  }

  @Patch(':id')
  @RequirePermission('marketing.manage')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertBlogPostSchema.partial())) body: Partial<UpsertBlogPost>,
  ) {
    return this.blog.update(id, body);
  }

  @Post(':id/publish')
  @RequirePermission('marketing.manage')
  publish(@Param('id') id: string) {
    return this.blog.publish(id);
  }

  @Post(':id/unpublish')
  @RequirePermission('marketing.manage')
  unpublish(@Param('id') id: string) {
    return this.blog.unpublish(id);
  }

  @Delete(':id')
  @RequirePermission('marketing.manage')
  remove(@Param('id') id: string) {
    return this.blog.remove(id);
  }
}
