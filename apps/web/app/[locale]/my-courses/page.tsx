import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { StudentCourseSummary, InstituteCourseSummary, CoursePricingResolved } from '@rajyarank/contracts';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';
import { BuyButton } from '@/components/BuyButton';

export const dynamic = 'force-dynamic';

const COVERS = [
  'from-navy-900 to-navy-800',
  'from-[#6b21a8] to-[#9d4edd]',
  'from-teal-600 to-[#18a68d]',
];

export default async function MyCoursesPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login`);
  const courses = (await apiFetchServer<StudentCourseSummary[]>('/student/courses', cookie)) ?? [];

  // Courses owned by the student's own institute (including "institute only"
  // ones that never appear in the public catalogue) that they haven't bought yet.
  const instituteCourses = (await apiFetchServer<InstituteCourseSummary[]>('/student/institute-courses', cookie)) ?? [];
  const notYetOwned = instituteCourses.filter((c) => !c.entitled);
  const institutePricing = await Promise.all(
    notYetOwned.map((c) => apiFetchServer<CoursePricingResolved>(`/student/courses/${c.courseId}/pricing`, cookie)),
  );

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('मेरे कोर्स', 'My Courses')}>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('मेरे कोर्स', 'My Courses')}</h1>
          <p className="mt-1 text-sm text-muted">{L('अपने नामांकित कोर्स जारी रखें और प्रगति देखें।', 'Continue your enrolled courses and monitor progress.')}</p>
        </div>
        <Link href={`/${locale}/exams`} className="inline-flex min-h-[42px] items-center gap-2 self-start rounded-xl bg-orange-500 px-4 text-xs font-extrabold text-white shadow-[0_9px_20px_rgba(245,116,23,0.2)] transition hover:-translate-y-0.5 hover:bg-orange-600">
          🧭 {L('कोर्स खोजें', 'Explore courses')}
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-[20px] border border-line bg-white p-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-surface-soft text-2xl">📚</div>
          <h3 className="mt-3.5 text-[15px] font-black text-navy-900">{L('अभी कोई नामांकित कोर्स नहीं', 'No enrolled courses yet')}</h3>
          <p className="mx-auto mt-1 max-w-sm text-[10.5px] text-muted">{L('कोर्स खोजें और नामांकन करें — वे यहाँ प्रगति के साथ दिखेंगे।', 'Explore and enrol in a course — it will appear here with your progress.')}</p>
          <Link href={`/${locale}/exams`} className="mt-4 inline-flex rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-extrabold text-white">{L('कोर्स खोजें', 'Explore courses')} →</Link>
        </div>
      ) : (
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c, i) => (
            <article key={c.courseId} className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
              <div className={`relative overflow-hidden bg-gradient-to-br ${COVERS[i % COVERS.length]} p-4 text-white`}>
                <span className="inline-flex rounded-full border border-white/15 bg-white/15 px-2 py-1 text-[8.5px] font-black">{c.code}</span>
                <h3 className="mt-5 max-w-[250px] text-[17px] font-black leading-tight">{hi ? c.titleHi : c.titleEn}</h3>
              </div>
              <div className="p-4">
                <div className="mb-3 flex flex-wrap gap-2 text-[9.5px] text-muted">
                  <span>▶ {c.lessonsTotal} {L('पाठ', 'lessons')}</span>
                  <span>✓ {c.lessonsCompleted} {L('पूर्ण', 'done')}</span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-[#eaf0f3]"><span className="block h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400" style={{ width: `${c.percentComplete}%` }} /></div>
                <div className="mt-1.5 flex justify-between text-[9px] text-muted">
                  <span>{c.percentComplete}% {L('पूर्ण', 'complete')}</span>
                  <span>{c.lessonsCompleted}/{c.lessonsTotal} {L('पाठ', 'lessons')}</span>
                </div>
                <div className="mt-3.5 flex items-center justify-between gap-2">
                  <small className="text-[9.5px] text-muted">{c.validUntil ? `${L('वैध', 'Valid until')} ${c.validUntil.slice(0, 10)}` : L('पूर्ण एक्सेस', 'Full access')}</small>
                  <Link href={`/${locale}/my-courses/${c.courseId}`} className="inline-flex min-h-[34px] items-center rounded-xl bg-orange-500 px-3 text-[10.5px] font-extrabold text-white transition hover:bg-orange-600">{L('जारी रखें', 'Continue')}</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {notYetOwned.length ? (
        <div className="mt-9">
          <h2 className="text-[18px] font-black text-navy-950">{L('आपके संस्थान के कोर्स', 'Your institute’s courses')}</h2>
          <p className="mt-1 text-sm text-muted">{L('आपके संस्थान द्वारा उपलब्ध कराए गए कोर्स, जिन्हें आपने अभी तक नहीं खरीदा है।', 'Courses made available by your institute that you haven’t bought yet.')}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notYetOwned.map((c, i) => {
              const pricing = institutePricing[i];
              const product = pricing?.qualifiesForInstitute && pricing.institute ? pricing.institute : pricing?.public;
              return (
                <div key={c.courseId} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-black text-navy-900">{hi ? c.titleHi : c.titleEn}</h3>
                    {c.visibility === 'PRIVATE' ? <span className="shrink-0 rounded-full bg-orange-100 px-2 py-1 text-[9px] font-extrabold text-orange-600">{L('केवल संस्थान', 'Institute only')}</span> : null}
                  </div>
                  <div className="text-xs text-muted">{c.code}</div>
                  {product ? (
                    <>
                      <div className="mt-3 flex items-end gap-2">
                        <strong className="text-xl font-black text-navy-950">₹{(product.priceMinor / 100).toLocaleString('en-IN')}</strong>
                        {product.originalPriceMinor && product.originalPriceMinor > product.priceMinor ? (
                          <span className="text-xs text-muted line-through">₹{(product.originalPriceMinor / 100).toLocaleString('en-IN')}</span>
                        ) : null}
                      </div>
                      <div className="mt-3">
                        <BuyButton productId={product.id!} locale={locale} />
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-xs text-muted">{L('मूल्य निर्धारण जल्द उपलब्ध होगा।', 'Pricing coming soon.')}</p>
                  )}
                  {c.visibility === 'PUBLIC' ? (
                    <Link href={`/${locale}/courses/${c.courseId}`} className="mt-2 inline-block text-xs font-bold text-navy-900 hover:underline">{L('विवरण देखें →', 'View details →')}</Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </StudentShell>
  );
}
