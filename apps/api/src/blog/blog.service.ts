import { Injectable } from '@nestjs/common';
import type { BlogPostSummary, BlogPostView, UpsertBlogPost } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';

type Row = {
  id: string;
  slug: string;
  titleHi: string;
  titleEn: string;
  excerptHi: string;
  excerptEn: string;
  bodyHi: string;
  bodyEn: string;
  category: string;
  tags: string[];
  coverImageUrl: string | null;
  authorName: string;
  seoTitleHi: string | null;
  seoTitleEn: string | null;
  seoDescriptionHi: string | null;
  seoDescriptionEn: string | null;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  private toView(row: Row): BlogPostView {
    const words = row.bodyEn.trim().split(/\s+/).filter(Boolean).length;
    return {
      ...row,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      readingMinutes: Math.max(1, Math.round(words / 200)),
    };
  }

  private toSummary(row: Row): BlogPostSummary {
    const { bodyHi: _bodyHi, bodyEn: _bodyEn, ...rest } = this.toView(row);
    return rest;
  }

  // ── Public ──
  async publicList(category?: string): Promise<BlogPostSummary[]> {
    const rows = await this.prisma.blogPost.findMany({
      where: { published: true, ...(category ? { category } : {}) },
      orderBy: { publishedAt: 'desc' },
    });
    return rows.map((r) => this.toSummary(r));
  }

  async publicBySlug(slug: string): Promise<BlogPostView> {
    const row = await this.prisma.blogPost.findFirst({ where: { slug, published: true } });
    if (!row) throw AppError.notFound('Post not found.');
    return this.toView(row);
  }

  // ── Admin ──
  async adminList(): Promise<BlogPostSummary[]> {
    const rows = await this.prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((r) => this.toSummary(r));
  }

  async adminGet(id: string): Promise<BlogPostView> {
    const row = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!row) throw AppError.notFound('Post not found.');
    return this.toView(row);
  }

  async create(actorUserId: string, dto: UpsertBlogPost): Promise<BlogPostView> {
    const existing = await this.prisma.blogPost.findUnique({ where: { slug: dto.slug } });
    if (existing) throw AppError.conflict('A post with this slug already exists.');
    const row = await this.prisma.blogPost.create({ data: { ...dto, createdBy: actorUserId } });
    return this.toView(row);
  }

  async update(id: string, dto: Partial<UpsertBlogPost>): Promise<BlogPostView> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Post not found.');
    if (dto.slug && dto.slug !== existing.slug) {
      const clash = await this.prisma.blogPost.findUnique({ where: { slug: dto.slug } });
      if (clash) throw AppError.conflict('A post with this slug already exists.');
    }
    const row = await this.prisma.blogPost.update({ where: { id }, data: dto });
    return this.toView(row);
  }

  async publish(id: string): Promise<BlogPostView> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Post not found.');
    const row = await this.prisma.blogPost.update({
      where: { id },
      data: { published: true, publishedAt: existing.publishedAt ?? new Date() },
    });
    return this.toView(row);
  }

  async unpublish(id: string): Promise<BlogPostView> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Post not found.');
    const row = await this.prisma.blogPost.update({ where: { id }, data: { published: false } });
    return this.toView(row);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Post not found.');
    await this.prisma.blogPost.delete({ where: { id } });
    return { ok: true };
  }
}
