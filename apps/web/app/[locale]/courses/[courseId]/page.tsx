import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { PublicHeader } from '@/components/PublicHeader';
import { StudentShell } from '@/components/StudentShell';
import { BuyButton } from '@/components/BuyButton';
import { InstitutePriceToggle } from '@/components/InstitutePriceToggle';
import { CourseSyllabus } from '@/components/CourseSyllabus';
import { CourseCurriculumPanel } from '@/components/CourseCurriculumPanel';
import { CourseProgressCard } from '@/components/CourseProgressCard';
import type { ProductView, CoursePricingResolved, CourseOutlineView, CoursePreviewResponse } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

type Outline = CourseOutlineView;

const SITE = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { locale: string; courseId: string };
  searchParams: { previewToken?: string };
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const course = searchParams.previewToken
    ? (await apiFetchServer<CoursePreviewResponse>(`/courses/${params.courseId}/preview?token=${encodeURIComponent(searchParams.previewToken)}`, ''))?.outline ?? null
    : await apiFetchServer<Outline>(`/courses/${params.courseId}/outline`, '');
  const title = course ? (hi ? course.titleHi : course.titleEn) : hi ? 'कोर्स' : 'Course';
  const description = course
    ? (hi ? course.descHi : course.descEn) ?? (hi ? `${title} — सिलेबस और तैयारी।` : `${title} — syllabus and preparation.`)
    : '';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/courses/${params.courseId}`,
      languages: {
        'hi-IN': `/hi/courses/${params.courseId}`,
        'en-IN': `/en/courses/${params.courseId}`,
        'x-default': `/hi/courses/${params.courseId}`,
      },
    },
  };
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: { locale: string; courseId: string };
  searchParams: { previewToken?: string };
}) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  // A valid preview token (minted from the Course Studio's Review step)
  // bypasses the ACTIVE+PUBLIC gate `outline()` enforces, so an Academic Head
  // can preview a course before it's actually published.
  const preview = searchParams.previewToken
    ? await apiFetchServer<CoursePreviewResponse>(`/courses/${params.courseId}/preview?token=${encodeURIComponent(searchParams.previewToken)}`, '')
    : null;

  const [me, outlineFetched, publicProducts] = await Promise.all([
    getMe(cookie),
    preview ? Promise.resolve(null) : apiFetchServer<Outline>(`/courses/${params.courseId}/outline`, ''),
    apiFetchServer<ProductView[]>('/products', ''),
  ]);
  const course = preview ? preview.outline : outlineFetched;
  if (!course) notFound();
  const isStudent = !!me && me.kind === 'STUDENT';
  const title = hi ? course.titleHi : course.titleEn;
  const desc = (hi ? course.descHi : course.descEn) ?? '';

  // Public price always resolvable anonymously; the institute price (if this
  // student qualifies) only ever comes from the authenticated lookup below.
  const publicProduct = (publicProducts ?? []).find((p) => p.kind === 'COURSE' && p.courseId === course.id) ?? null;
  const resolved = isStudent ? await apiFetchServer<CoursePricingResolved>(`/student/courses/${course.id}/pricing`, cookie) : null;
  const buyProduct = resolved?.qualifiesForInstitute && resolved.institute ? resolved.institute : publicProduct;

  const content = (
    <>
      <nav className="mb-4 text-sm text-muted">
        <Link href={`/${locale}/exams`} className="hover:underline">{L('परीक्षाएँ', 'Exams')}</Link> /{' '}
        <Link href={`/${locale}/exams/${course.examId}`} className="hover:underline">{L('परीक्षा', 'Exam')}</Link> /{' '}
        <span className="text-ink">{title}</span>
      </nav>

      <div className="mb-1 text-xs font-extrabold uppercase text-teal-600">{course.code}</div>
      <h1 className="text-3xl font-black text-navy-950">{title}</h1>
      {desc ? <p className="mt-3 max-w-2xl text-muted">{desc}</p> : null}

      {course.orgId ? (
        <InstitutePriceToggle
          courseId={course.id}
          locale={locale}
          publicProduct={publicProduct}
          instituteProduct={resolved?.institute ?? null}
          qualifiesForInstitute={!!resolved?.qualifiesForInstitute}
          isStudent={isStudent}
        />
      ) : buyProduct ? (
        <div className="mt-5 max-w-xs rounded-lg border border-line bg-white p-5">
          <div className="flex items-end gap-2">
            <strong className="text-3xl font-black text-navy-950">₹{(buyProduct.priceMinor / 100).toLocaleString('en-IN')}</strong>
            {buyProduct.originalPriceMinor && buyProduct.originalPriceMinor > buyProduct.priceMinor ? (
              <span className="text-sm text-muted line-through">₹{(buyProduct.originalPriceMinor / 100).toLocaleString('en-IN')}</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">{buyProduct.validityDays ? L(`${buyProduct.validityDays} दिन वैधता`, `${buyProduct.validityDays} days validity`) : L('आजीवन', 'Lifetime')}</p>
          <div className="mt-4">
            <BuyButton productId={buyProduct.id!} locale={locale} />
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={`/${locale}/pricing`} className="rounded-md bg-orange-500 px-6 py-3 font-extrabold text-white hover:bg-orange-600">
            {L('नामांकन व मूल्य देखें', 'Enroll · see pricing')}
          </Link>
          {isStudent ? null : (
            <Link href={`/${locale}/login`} className="rounded-md border border-line bg-white px-6 py-3 font-extrabold text-navy-900">
              {L('लॉगिन', 'Log in')}
            </Link>
          )}
        </div>
      )}

      <CourseSyllabus course={course} locale={locale} />

      {preview ? (
        <div className="mt-10">
          <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
            {L(
              'पूर्वावलोकन: नामांकित छात्र दृश्य — नीचे दिखाई गई प्रगति नमूना है, किसी वास्तविक छात्र का डेटा नहीं।',
              'Preview: enrolled-student view — the progress shown below is a sample, not any real student’s data.',
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
            <CourseCurriculumPanel course={preview.curriculum} locale={locale} />
            <CourseProgressCard course={preview.curriculum} locale={locale} />
          </div>
        </div>
      ) : null}
    </>
  );

  // Logged-in student → portal shell (no public login CTAs).
  if (isStudent) {
    return (
      <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={title}>
        {content}
      </StudentShell>
    );
  }

  // Public visitor → marketing header + SEO structured data.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: title,
    description: desc || title,
    provider: { '@type': 'Organization', name: 'RajyaRank', url: SITE },
    url: `${SITE}/${locale}/courses/${course.id}`,
  };
  return (
    <>
      <PublicHeader locale={locale} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main id="main" className="mx-auto max-w-4xl px-4 py-10">{content}</main>
    </>
  );
}
