import type { ProductView } from '@rajyarank/contracts';

export interface CourseListItem { id: string; code: string; titleHi: string; titleEn: string; stateId: string; examId: string; orgId: string | null }

export interface FilterableCourse {
  id: string;
  code: string;
  titleHi: string;
  titleEn: string;
  stateId: string;
  examId: string;
  orgId: string | null;
  priceMinor: number;
  originalPriceMinor: number | null;
  validityDays: number | null;
  product: ProductView;
}

/** Joins the public course list with public product pricing, dropping any
 *  course that has no public product yet — shared by the homepage teaser
 *  and the All Courses page so both stay in sync. Plain module (no
 *  'use client') so Server Components can call it directly. */
export function toFilterableCourses(courseList: CourseListItem[], products: ProductView[]): FilterableCourse[] {
  const priceByCourse = new Map(products.filter((p) => p.kind === 'COURSE' && p.courseId).map((p) => [p.courseId as string, p]));
  return courseList
    .filter((c) => priceByCourse.has(c.id))
    .map((c) => {
      const product = priceByCourse.get(c.id)!;
      return {
        id: c.id,
        code: c.code,
        titleHi: c.titleHi,
        titleEn: c.titleEn,
        stateId: c.stateId,
        examId: c.examId,
        orgId: c.orgId,
        priceMinor: product.priceMinor,
        originalPriceMinor: product.originalPriceMinor,
        validityDays: product.validityDays,
        product,
      };
    });
}
