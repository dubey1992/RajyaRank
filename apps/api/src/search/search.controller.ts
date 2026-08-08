import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/** Public global search across the discoverable catalogue (exams + published,
 *  public courses). Case-insensitive contains match — mirrors the existing
 *  staff-list search pattern. Student-facing only; nothing private is exposed. */
@Controller('search')
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async search(@Query('q') q?: string) {
    const term = (q ?? '').trim();
    if (term.length < 2) return { exams: [], courses: [] };

    // Excludes only REJECTED-KYC institutes' courses (not PENDING/unverified)
    // — mirrors the same exclusion in catalogue.controller.ts's public
    // course/institute listings, so a rejected institute can't be found via
    // search either, not just hidden from browse.
    const rejectedOrgIds = (await this.prisma.instituteLinkedAccount.findMany({ where: { kycStatus: 'REJECTED' }, select: { orgId: true } })).map((r) => r.orgId);

    const [exams, courses] = await Promise.all([
      this.prisma.exam.findMany({
        where: {
          OR: [
            { nameEn: { contains: term, mode: 'insensitive' } },
            { nameHi: { contains: term } },
            { code: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, code: true, nameHi: true, nameEn: true, stateId: true },
        take: 20,
      }),
      this.prisma.course.findMany({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          visibility: 'PUBLIC',
          AND: [
            {
              OR: [
                { titleEn: { contains: term, mode: 'insensitive' } },
                { titleHi: { contains: term } },
                { code: { contains: term, mode: 'insensitive' } },
              ],
            },
            { OR: [{ orgId: null }, { orgId: { notIn: rejectedOrgIds } }] },
          ],
        },
        select: { id: true, code: true, titleHi: true, titleEn: true, examId: true },
        take: 20,
      }),
    ]);

    return { exams, courses };
  }
}
