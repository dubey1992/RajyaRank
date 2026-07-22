import Link from 'next/link';
import { Logo } from '@rajyarank/ui';
import { resolveLocale, getT } from '@/lib/i18n';
import { PublicHeader } from '@/components/PublicHeader';
import { DemoQuiz } from '@/components/DemoQuiz';
import { CoursesFilterGrid } from '@/components/CoursesFilterGrid';
import { toFilterableCourses, type CourseListItem } from '@/lib/courses';
import { apiFetchServer } from '@/lib/api';
import type { ProductView, PartnerInstituteView, State, Exam, TestimonialView, FaqView, StudyContentTeaserView } from '@rajyarank/contracts';

const TEASER_STYLE: Record<StudyContentTeaserView['kind'], { icon: string; color: string; fg: string }> = {
  VIDEO: { icon: '▶', color: 'edf4ff', fg: '2e69ba' },
  PDF: { icon: '📄', color: 'fff5e9', fg: 'd96b17' },
  TEST: { icon: '📝', color: 'e9f8f5', fg: '15948c' },
  PACK: { icon: '🔁', color: 'fff1f3', fg: 'c64355' },
};

// Shared button styles — mirror the prototype's primary/outline/light treatments.
const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-extrabold text-white shadow-[0_9px_20px_rgba(249,115,22,0.25)] transition hover:-translate-y-0.5 hover:bg-orange-600';
const BTN_OUTLINE =
  'inline-flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-orange-500/50 bg-white px-5 py-3 font-extrabold text-orange-600 transition hover:-translate-y-0.5 hover:border-orange-500';

export default async function LandingPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const t = getT(locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const [courseList, products, institutes, states, examList, testimonials, faqRows, teasers] = await Promise.all([
    apiFetchServer<CourseListItem[]>('/courses', ''),
    apiFetchServer<ProductView[]>('/products', ''),
    apiFetchServer<PartnerInstituteView[]>('/institutes', ''),
    apiFetchServer<State[]>('/states', ''),
    apiFetchServer<Exam[]>('/exams', ''),
    apiFetchServer<TestimonialView[]>('/testimonials', ''),
    apiFetchServer<FaqView[]>('/faqs', ''),
    apiFetchServer<StudyContentTeaserView[]>('/study-content-teasers', ''),
  ]);
  const courses = toFilterableCourses(courseList ?? [], products ?? []).slice(0, 24);
  const plans = (products ?? []).filter((p) => p.kind === 'SUBSCRIPTION');

  const exams = [
    { icon: '🏛️', name: 'SSC CGL', tag: L('लोकप्रिय', 'Popular'), official: true, desc: L('संयुक्त स्नातक स्तर की संपूर्ण तैयारी — सिलेबस प्लान, अभ्यास सेट और मॉक टेस्ट।', 'Complete Combined Graduate Level prep — syllabus plan, practice sets and mock tests.'), meta: ['Hindi', L('60+ वीडियो', '60+ videos'), L('1500+ प्रश्न', '1500+ MCQs')], price: '₹499', validity: L('परीक्षा-चक्र वैधता', 'Exam-cycle validity') },
    { icon: '🚂', name: 'Railways (RRB)', tag: L('नया', 'New'), official: false, desc: L('विषय-वार अध्ययन योजना, पिछले वर्ष के प्रश्न और पूर्ण-लंबाई टेस्ट सीरीज़।', 'Subject-wise study plan, previous-year questions and full-length test series.'), meta: [L('द्विभाषी', 'Bilingual'), L('80+ वीडियो', '80+ videos'), L('20 मॉक', '20 mocks')], price: '₹699', validity: L('6 माह वैधता', '6 months validity') },
    { icon: '🛡️', name: 'State PSC', tag: L('लोकप्रिय', 'Popular'), official: true, desc: L('कॉन्सेप्ट वीडियो, MCQ और परीक्षा-केंद्रित रिवीज़न नोट्स।', 'Concept videos, MCQs and exam-oriented revision notes.'), meta: ['Hindi', L('50+ वीडियो', '50+ videos'), L('1200+ प्रश्न', '1200+ MCQs')], price: '₹499', validity: L('परीक्षा-चक्र वैधता', 'Exam-cycle validity') },
    { icon: '🏦', name: 'Banking (IBPS)', tag: L('नया', 'New'), official: false, desc: L('सामान्य अध्ययन, रीज़निंग, भाषा और मात्रात्मक अभिरुचि की संरचित तैयारी।', 'Structured prep for general studies, reasoning, language and quantitative aptitude.'), meta: [L('द्विभाषी', 'Bilingual'), L('90+ वीडियो', '90+ videos'), L('25 मॉक', '25 mocks')], price: '₹799', validity: L('8 माह वैधता', '8 months validity') },
    { icon: '🎖️', name: 'Defence (NDA/Agniveer)', tag: L('लोकप्रिय', 'Popular'), official: true, desc: L('गणित, सामान्य ज्ञान और अंग्रेज़ी के साथ लिखित परीक्षा की पूरी तैयारी।', 'Full written-exam prep covering maths, general knowledge and English.'), meta: ['Hindi', L('45+ वीडियो', '45+ videos'), L('अभ्यास PDF', 'Practice PDFs')], price: '₹399', validity: L('4 माह वैधता', '4 months validity') },
    { icon: '📚', name: 'Teaching (CTET/TET)', tag: L('नया', 'New'), official: false, desc: L('बाल विकास, शिक्षाशास्त्र और विषय-वार अभ्यास सेट के साथ तैयारी।', 'Prep with child development, pedagogy and subject-wise practice sets.'), meta: [L('द्विभाषी', 'Bilingual'), L('55+ वीडियो', '55+ videos'), L('15 मॉक', '15 mocks')], price: '₹499', validity: L('6 माह वैधता', '6 months validity') },
  ];
  const features = [
    { icon: '🗓️', h: L('दैनिक अध्ययन योजना', 'Daily study plan'), p: L('हर दिन क्या पढ़ना है — पाठ, अभ्यास, करेंट अफेयर्स और रिवीज़न।', 'What to study each day — lessons, practice, current affairs and revision.') },
    { icon: '🎥', h: L('शॉर्ट कॉन्सेप्ट वीडियो', 'Short concept videos'), p: L('कम डेटा में चलने वाली चैप्टर-वाइज़ वीडियो और रिज़्यूम प्लेबैक।', 'Chapter-wise videos that run on low data, with resume playback.') },
    { icon: '📄', h: L('सुरक्षित नोट्स', 'Protected notes'), p: L('कोर्स-लिंक्ड PDF, बुकमार्क और रिवीज़न-फ़्रेंडली शॉर्ट नोट्स।', 'Course-linked PDFs, bookmarks and revision-friendly short notes.') },
    { icon: '🧪', h: L('स्मार्ट मॉक टेस्ट', 'Smart mock tests'), p: L('सटीकता, समय, कमज़ोर टॉपिक, छूटे प्रश्न और विस्तृत समाधान।', 'Accuracy, time, weak topics, skipped questions and detailed solutions.') },
    { icon: '🔁', h: L('रिवीज़न सेंटर', 'Revision centre'), p: L('गलत प्रश्न, बुकमार्क और लंबित पाठ एक ही जगह।', 'Wrong questions, bookmarks and pending lessons in one place.') },
    { icon: '💬', h: L('डाउट सपोर्ट', 'Doubt support'), p: L('टेक्स्ट या इमेज से प्रश्न पूछें, पाठ-लिंक्ड उत्तर पाएं।', 'Ask by text or image; get lesson-linked answers.') },
    { icon: '🔔', h: L('परीक्षा अलर्ट', 'Exam alerts'), p: L('आधिकारिक सूचना, एडमिट कार्ड, आंसर की और ज़रूरी तिथि रिमाइंडर।', 'Official notices, admit cards, answer keys and important-date reminders.') },
    { icon: '📶', h: L('कम नेटवर्क फ़्रेंडली', 'Low-network friendly'), p: L('हल्के पेज, टेस्ट ऑटो-सेव और चुनिंदा कंटेंट ऑफ़लाइन-रेडी।', 'Lightweight pages, test auto-save and selected content offline-ready.') },
  ];
  return (
    <main id="main" className="bg-[#fffdfb]">
      {/* Announcement */}
      <div className="bg-navy-950 px-4 py-2 text-center text-[13px] font-medium text-white">
        🎯 {L('मुफ़्त दैनिक क्विज़: SSC और Railways अभ्यास आज उपलब्ध।', 'Free daily quiz: SSC & Railways practice available today.')}
      </div>

      {/* Header */}
      <PublicHeader locale={locale} showInstitutesLink={!!(institutes && institutes.length)} />

      {/* Hero */}
      <section
        className="overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(255,195,134,0.34), transparent 35%), radial-gradient(circle at 90% 10%, rgba(15,139,120,0.12), transparent 24%), linear-gradient(180deg, #fffaf5, #fffdfb)',
        }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-11 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-[66px]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">
              🚀 {L('हिंदी-प्रथम सरकारी परीक्षा तैयारी', 'Hindi-first government exam preparation')}
            </span>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.04] tracking-tight text-navy-950 md:text-[56px]">
              {L('All Over India की सरकारी नौकरी की तैयारी, ', 'Prepare for government jobs All Over India, ')}
              <span className="text-orange-500">{L('सही दिशा के साथ।', 'with the right direction.')}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[#526071]">
              {L('आसान भाषा में वीडियो क्लास, नोट्स, पिछले वर्षों के प्रश्न, मॉक टेस्ट और हर दिन का व्यक्तिगत अध्ययन प्लान।', 'Video classes in simple language, notes, previous-year questions, mock tests and a personalised daily study plan.')}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#exams" className={BTN_PRIMARY}>{L('अपनी परीक्षा चुनें', 'Choose your exam')}</a>
              <a href="#daily-quiz" className={BTN_OUTLINE}>{L('मुफ़्त डेमो क्विज़', 'Free demo quiz')}</a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold text-navy-800">
              <li className="inline-flex items-center gap-1.5"><span className="text-success">✓</span> {L('बिना लॉगिन सिलेबस देखें', 'Browse syllabus without login')}</li>
              <li className="inline-flex items-center gap-1.5"><span className="text-success">✓</span> {L('कम डेटा में मोबाइल-फ़्रेंडली', 'Mobile-friendly on low data')}</li>
              <li className="inline-flex items-center gap-1.5"><span className="text-success">✓</span> {L('हिंदी + English प्रश्न', 'Hindi + English questions')}</li>
            </ul>
          </div>

          {/* Hero dashboard card */}
          <div className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.08)] md:rotate-[1.2deg]" aria-label={L('छात्र डैशबोर्ड झलक', 'Student dashboard preview')}>
            <div className="bg-gradient-to-br from-navy-900 to-navy-800 p-6 text-white">
              <small className="text-white/75">{L('आज का अध्ययन लक्ष्य', "Today's study goal")}</small>
              <h2 className="mb-3 mt-1.5 text-2xl font-black">{L('नमस्ते, रवि 👋', 'Hello, Ravi 👋')}</h2>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span>{L('साप्ताहिक प्रगति', 'Weekly progress')}</span>
                <strong>64%</strong>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                <span className="block h-full w-[64%] rounded-full bg-gradient-to-r from-orange-500 to-orange-400" />
              </div>
            </div>
            <div className="grid gap-3 p-6">
              {[
                { icon: '▶', h: L('भारतीय संविधान', 'Indian Constitution'), s: L('पाठ 8 · 24 मिनट', 'Lesson 8 · 24 min'), a: L('जारी रखें', 'Continue') },
                { icon: '📝', h: L('दैनिक क्विज़', 'Daily quiz'), s: L('10 प्रश्न · करेंट अफेयर्स', '10 MCQs · Current affairs'), a: L('शुरू करें', 'Start') },
                { icon: '📊', h: L('कमज़ोर टॉपिक', 'Weak topic'), s: L('गणित: प्रतिशत', 'Maths: Percentage'), a: L('रिवाइज़', 'Revise') },
              ].map((it) => (
                <div key={it.h} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-soft p-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-orange-100 text-orange-600">{it.icon}</span>
                    <div>
                      <strong className="block text-sm text-ink">{it.h}</strong>
                      <small className="text-muted">{it.s}</small>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-orange-600">{it.a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Proof strip */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-white p-6 text-center shadow-[0_9px_28px_rgba(15,23,42,0.05)] md:grid-cols-4">
          {[['100+', L('संरचित पाठ', 'Structured lessons')], ['1,500+', L('अभ्यास प्रश्न', 'Practice questions')], ['25+', L('मॉक टेस्ट', 'Mock tests')], ['2', L('इंटरफ़ेस भाषाएँ', 'Interface languages')]].map(([n, label]) => (
            <div key={label}>
              <div className="text-2xl font-black text-navy-900">{n}</div>
              <div className="text-xs font-semibold text-muted">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Exams */}
      <section id="exams" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="mx-auto mb-9 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">{L('अपनी तैयारी शुरू करें', 'Start your preparation')}</span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-navy-950 md:text-[40px]">{L('अपने लक्ष्य के लिए सही परीक्षा चुनें', 'Find the right exam for your goal')}</h2>
          <p className="mt-2 text-muted">{L('All Over India की लोकप्रिय सरकारी परीक्षाएँ। और श्रेणियाँ जुड़ती रहेंगी।', 'Popular government exams from All Over India. More categories are added as the platform grows.')}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Static preview cards — informational only. No CTA: these categories
              aren't backed by real courses/pricing yet, so we don't link or
              imply a specific course exists behind them (see project memory). */}
          {exams.map((c) => (
            <article key={c.name} className="flex flex-col rounded-lg border border-line bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-[15px] bg-orange-100 text-2xl">{c.icon}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-extrabold ${c.official ? 'bg-teal-100 text-success' : 'bg-surface-soft text-muted'}`}>
                  {c.official ? '★ ' : ''}{c.tag}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-black text-navy-900">{c.name}</h3>
              <p className="mt-1.5 text-sm text-muted">{c.desc}</p>
              <div className="my-4 flex flex-wrap gap-2">
                {c.meta.map((m) => (
                  <span key={m} className="rounded-lg border border-line bg-surface-soft px-2.5 py-1.5 text-xs text-[#475569]">{m}</span>
                ))}
              </div>
              <div className="mt-auto border-t border-line pt-4">
                <strong className="text-[22px] font-black text-navy-950">{c.price}</strong>
                <small className="block text-muted">{c.validity}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Real courses — API-driven, unlike the informational Exams cards above */}
      {courses.length ? (
        <section id="courses" className="border-y border-line bg-surface-soft">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="mx-auto mb-9 max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">{L('संस्थानों से कोर्स', 'Courses from institutes')}</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-navy-950 md:text-[40px]">{L('अभी उपलब्ध कोर्स', 'Courses available now')}</h2>
              <p className="mt-2 text-muted">{L('संस्थान के छात्रों के लिए विशेष मूल्य के साथ, सभी के लिए खुला।', 'Open to everyone, with a special price for the owning institute’s own students.')}</p>
            </div>
            <CoursesFilterGrid courses={courses} states={states ?? []} exams={examList ?? []} locale={locale} mode="browse" />
            <div className="mt-8 text-center">
              <Link href={`/${locale}/courses`} className="inline-flex items-center gap-2 text-sm font-extrabold text-navy-900 hover:underline">
                {L('सभी कोर्स देखें', 'View all courses')} →
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Individual study content — presentational preview; purchase not yet live */}
      {teasers && teasers.length ? (
        <section id="content" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="mx-auto mb-9 max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">{L('अलग से खरीदें', 'Buy individually')}</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-navy-950 md:text-[40px]">{L('अध्ययन सामग्री अलग से खरीदें', 'Buy individual study content')}</h2>
            <p className="mt-2 text-muted">{L('पूरा कोर्स नहीं चाहिए? सिर्फ़ वह वीडियो, PDF, टेस्ट या रिवीज़न पैक ख़रीदें जिसकी ज़रूरत है।', 'Don’t need a whole course? Buy only the video, PDF, test, or revision pack you actually need.')}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {teasers.map((item) => {
              const style = TEASER_STYLE[item.kind];
              return (
                <article key={item.id} className="flex flex-col rounded-lg border border-line bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <div className="grid h-28 place-items-center rounded-md text-3xl" style={{ background: `#${style.color}`, color: `#${style.fg}` }}>{style.icon}</div>
                  <span className="mt-3 inline-flex w-fit rounded-full bg-surface-soft px-2 py-1 text-[10px] font-extrabold text-muted">{item.kind}</span>
                  <h3 className="mt-2 text-sm font-black text-navy-900">{hi ? item.titleHi : item.titleEn}</h3>
                  <p className="mt-1 text-xs text-muted">{hi ? item.descHi : item.descEn}</p>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-extrabold text-success">{L('जल्द आ रहा है', 'Coming soon')}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Partner institutes */}
      {institutes && institutes.length ? (
        <section id="institutes" className="border-y border-line bg-surface-soft">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="mx-auto mb-9 max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">{L('साझेदार संस्थान', 'Partner institutes')}</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-navy-950 md:text-[40px]">{L('साझेदार संस्थान', 'Partner institutes')}</h2>
              <p className="mt-2 text-muted">{L('संस्थान सार्वजनिक रूप से बेचते हुए भी अपने नामांकित छात्रों के लिए निजी कोर्स और विशेष मूल्य रख सकते हैं।', 'Institutes can sell publicly while keeping private courses and special pricing for their own enrolled students.')}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {institutes.map((o) => (
                <div key={o.id} className="flex items-center gap-3 rounded-lg border border-line bg-white p-4">
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-orange-100 text-sm font-black text-orange-600">
                    {o.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <div>
                    <div className="font-extrabold text-ink">{o.name}</div>
                    <div className="text-xs text-muted">{L(`${o.publicCount} सार्वजनिक · ${o.instituteCount} संस्थान`, `${o.publicCount} public · ${o.instituteCount} institute`)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* How access works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="mx-auto mb-9 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">{L('कैसे काम करता है', 'How it works')}</span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-navy-950 md:text-[40px]">{L('एक्सेस कैसे मिलता है', 'How access works')}</h2>
          <p className="mt-2 text-muted">{L('एक ही उत्पाद संस्थान के छात्रों और स्वतंत्र शिक्षार्थियों दोनों की सेवा कर सकता है।', 'The same product can support institute students and independent learners.')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: 1, h: L('उत्पाद चुनें', 'Choose product'), p: L('कोर्स, वीडियो, PDF, टेस्ट या रिवीज़न पैक।', 'Course, video, PDF, test or revision pack.') },
            { n: 2, h: L('शिक्षार्थी प्रकार सत्यापित करें', 'Verify learner type'), p: L('संस्थान नामांकन या सार्वजनिक शिक्षार्थी पंजीकरण।', 'Institute enrolment or public learner registration.') },
            { n: 3, h: L('सुरक्षित भुगतान करें', 'Pay securely'), p: L('UPI, कार्ड, नेट बैंकिंग या संस्थान कोड।', 'UPI, cards, net banking or an institute code.') },
            { n: 4, h: L('एक्सेस प्राप्त करें', 'Receive access'), p: L('सत्यापित एक्सेस तुरंत आपके My Courses में दिखता है।', 'Verified access appears immediately in My Courses.') },
          ].map((s) => (
            <div key={s.n} className="rounded-lg border border-line bg-white p-4">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-navy-950 text-sm font-black text-white">{s.n}</div>
              <h3 className="mt-2.5 text-sm font-black text-navy-900">{s.h}</h3>
              <p className="mt-1 text-xs text-muted">{s.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Free demo quiz */}
      <section id="daily-quiz" className="border-y border-line bg-surface-soft">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-[0.95fr_1.05fr] md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">{L('बिना लॉगिन मुफ़्त अभ्यास', 'Free practice · no login')}</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-navy-950 md:text-[40px]">{L('अभी एक नमूना प्रश्न आज़माएँ', 'Try a sample question now')}</h2>
            <p className="mt-2 text-muted">
              {L('दैनिक क्विज़ का यह डेमो बिना खाते के काम करता है। पूरा अनुभव और प्रगति सेव करने के लिए मुफ़्त साइन इन करें।', 'This daily-quiz demo works without an account. Sign in free to save progress and unlock the full experience.')}
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold text-navy-800">
              <li className="inline-flex items-center gap-1.5"><span className="text-success">✓</span> {L('रोज़ 10 प्रश्न', 'Daily 10 questions')}</li>
              <li className="inline-flex items-center gap-1.5"><span className="text-success">✓</span> {L('उत्तर व्याख्या', 'Answer explanation')}</li>
              <li className="inline-flex items-center gap-1.5"><span className="text-success">✓</span> {L('शेयर करने योग्य परिणाम', 'Shareable result')}</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/${locale}/login`} className={BTN_PRIMARY}>{t('nav.startFree')}</Link>
              <Link href={`/${locale}/tests`} className={BTN_OUTLINE}>{L('पूरी टेस्ट सीरीज़', 'Full test series')}</Link>
            </div>
          </div>
          <DemoQuiz locale={locale} />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="mx-auto mb-9 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">{L('सिर्फ़ वीडियो नहीं', 'Not just videos')}</span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-navy-950 md:text-[40px]">{L('एक complete preparation system', 'A complete preparation system')}</h2>
          <p className="mt-2 text-muted">{L('हर फ़ीचर का उद्देश्य छात्र को स्पष्ट दिशा, अभ्यास और परफ़ॉर्मेंस फ़ीडबैक देना है।', 'Every feature exists to give students clear direction, practice and performance feedback.')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <article key={f.h} className="rounded-md border border-line bg-white p-5">
              <div className="mb-3.5 grid h-11 w-11 place-items-center rounded-xl bg-orange-100 text-xl text-orange-600">{f.icon}</div>
              <h3 className="font-extrabold text-navy-900">{f.h}</h3>
              <p className="mt-1.5 text-[13px] text-muted">{f.p}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Student Plans — real SUBSCRIPTION-kind products, Super-Admin priced.
          No per-card buy CTA here by design (see project memory on the
          top-of-funnel marketing page never carrying a direct purchase path)
          — one shared link to the full pricing page instead. */}
      {plans.length > 0 ? (
        <section id="plans" className="border-y border-line bg-surface-soft">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="mx-auto mb-9 max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">{L('सरल मूल्य', 'Simple pricing')}</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-navy-950 md:text-[40px]">{L('छात्र योजनाएँ', 'Student Plans')}</h2>
              <p className="mt-2 text-muted">{L('एक बार भुगतान करें, तय दिनों तक पहुँच पाएं — कोई ऑटो-रिन्यू नहीं।', 'Pay once, get access for a fixed number of days — no auto-renewal.')}</p>
            </div>
            <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
              {plans.map((p) => (
                <article key={p.id} className="flex flex-col rounded-lg border border-line bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <span className="w-fit rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-extrabold text-orange-600">
                    {p.examId ? L('Plus · एक परीक्षा', 'Plus · one exam') : L('Pro · सभी परीक्षाएँ', 'Pro · all exams')}
                  </span>
                  <h3 className="mt-3 text-lg font-black text-navy-900">{hi ? p.titleHi : p.titleEn}</h3>
                  <div className="my-3 flex items-end gap-2">
                    <span className="text-3xl font-black text-navy-950">₹{(p.priceMinor / 100).toLocaleString('en-IN')}</span>
                    {p.originalPriceMinor && p.originalPriceMinor > p.priceMinor ? (
                      <span className="mb-1 text-sm text-muted line-through">₹{(p.originalPriceMinor / 100).toLocaleString('en-IN')}</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted">{p.validityDays ? `${p.validityDays} ${L('दिन वैधता', 'days validity')}` : L('आजीवन', 'Lifetime')}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href={`/${locale}/pricing`} className="inline-flex items-center gap-2 text-sm font-extrabold text-navy-900 hover:underline">
                {L('पूरा मूल्य देखें', 'See full pricing')} →
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* For Institutions */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div
          className="grid items-center gap-8 rounded-[28px] p-9 text-white md:grid-cols-[1.3fr_auto] md:p-10"
          style={{
            background:
              'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.14), transparent 28%), linear-gradient(135deg, #0b2f4f, #12476f)',
          }}
        >
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[13px] font-extrabold text-white">
              {L('संस्थानों के लिए', 'For Institutions')}
            </span>
            <h2 className="mt-3 text-2xl font-black md:text-3xl">{L('अपने कोचिंग संस्थान को RajyaRank पर लाएँ', 'Bring your coaching institute onto RajyaRank')}</h2>
            <p className="mt-2 max-w-xl text-white/80">
              {L('कोचिंग सेंटर, स्कूल और NGO अपने सभी छात्रों को एक साथ जोड़ सकते हैं — केंद्रीकृत प्रबंधन और रिपोर्टिंग के साथ।', 'Coaching centres, schools and NGOs can onboard all their students together — with centralised management and reporting.')}
            </p>
            <ul className="mt-5 grid gap-2 text-sm text-white/85 sm:grid-cols-2">
              <li className="flex gap-2"><span className="font-black text-teal-200">✓</span>{L('थोक में छात्र नामांकन', 'Bulk student enrolment')}</li>
              <li className="flex gap-2"><span className="font-black text-teal-200">✓</span>{L('समर्पित शैक्षणिक प्रमुख डैशबोर्ड', 'Dedicated Academic Head dashboard')}</li>
              <li className="flex gap-2"><span className="font-black text-teal-200">✓</span>{L('संस्थान-व्यापी प्रगति रिपोर्ट', 'Institution-wide progress reports')}</li>
              <li className="flex gap-2"><span className="font-black text-teal-200">✓</span>{L('प्राथमिकता ऑनबोर्डिंग व सहायता', 'Priority onboarding & support')}</li>
            </ul>
          </div>
          <a
            href={`mailto:institutions@rajyarank.in?subject=${encodeURIComponent(L('संस्थान साझेदारी पूछताछ', 'Institution partnership enquiry'))}`}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-white px-6 py-3 font-extrabold text-navy-900 transition hover:-translate-y-0.5"
          >
            {L('हमसे संपर्क करें', 'Contact us')}
          </a>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials && testimonials.length ? (
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="mx-auto mb-9 max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">{L('छात्र फ़ीडबैक झलक', 'Student feedback preview')}</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-navy-950 md:text-[40px]">{L('छात्रों के अनुभव', 'What students say')}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((r) => (
              <article key={r.id} className="rounded-md border border-line bg-white p-5">
                <div className="mb-2.5 tracking-[2px] text-yellow-500">★★★★★</div>
                <p className="text-sm text-[#475569]">{hi ? r.quoteHi : r.quoteEn}</p>
                <div className="mt-4 flex items-center gap-2.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-soft font-black text-navy-900">{r.initials}</span>
                  <div>
                    <strong className="block text-sm text-navy-900">{r.studentName}</strong>
                    <span className="text-xs text-muted">{r.examLabel} {L('अभ्यर्थी', 'aspirant')}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted">{L('उत्पादन में केवल सत्यापित समीक्षाएँ दिखाई जाएँगी।', 'Production shows only verified reviews.')}</p>
        </section>
      ) : null}

      {/* FAQ (native accessible accordion) */}
      {faqRows && faqRows.length ? (
        <section id="faq" className="border-y border-line bg-surface-soft">
          <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
            <div className="mb-9 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">{L('सामान्य प्रश्न', 'Common questions')}</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-navy-950 md:text-[40px]">{t('nav.faq')}</h2>
            </div>
            <div className="grid gap-3">
              {faqRows.map((f) => (
                <details key={f.id} className="group rounded-md border border-line bg-white">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 font-extrabold text-navy-900 [&::-webkit-details-marker]:hidden">
                    <span>{hi ? f.questionHi : f.questionEn}</span>
                    <span className="text-xl text-orange-500 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-muted">{hi ? f.answerHi : f.answerEn}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div
          className="grid items-center gap-6 rounded-[28px] p-9 text-white md:grid-cols-[1fr_auto] md:p-10"
          style={{
            background:
              'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.16), transparent 25%), linear-gradient(135deg, #0b2f4f, #0f8b78)',
          }}
        >
          <div>
            <h2 className="text-2xl font-black md:text-3xl">{L('आज ही अपनी तैयारी शुरू करें', 'Start your preparation today')}</h2>
            <p className="mt-2 text-white/80">{L('मुफ़्त क्विज़ से शुरू करें, फिर अपना कोर्स चुनें।', 'Begin with the free quiz, then choose your course.')}</p>
          </div>
          <Link href={`/${locale}/login`} className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-extrabold text-navy-900 transition hover:-translate-y-0.5">
            {t('nav.startFree')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-950 text-white/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo size={34} />
            <p className="mt-3 max-w-xs text-sm text-white/60">{L('स्पष्टता, अभ्यास और मापनीय प्रगति पर केंद्रित हिंदी-प्रथम सरकारी परीक्षा तैयारी।', 'Hindi-first government-exam prep focused on clarity, practice and measurable progress.')}</p>
          </div>
          <div>
            <h4 className="mb-3 font-extrabold text-white">{t('nav.exams')}</h4>
            <ul className="grid gap-2 text-sm text-white/60"><li>SSC CGL</li><li>Railways (RRB)</li><li>State PSC</li><li>Banking (IBPS)</li></ul>
          </div>
          <div>
            <h4 className="mb-3 font-extrabold text-white">{L('संसाधन', 'Resources')}</h4>
            <ul className="grid gap-2 text-sm text-white/60">
              <li><a className="transition hover:text-white" href="#daily-quiz">{L('दैनिक क्विज़', 'Daily quiz')}</a></li>
              <li><a className="transition hover:text-white" href="#features">{t('nav.features')}</a></li>
              <li><Link className="transition hover:text-white" href={`/${locale}/pricing`}>{t('nav.pricing')}</Link></li>
              <li><Link className="transition hover:text-white" href={`/${locale}/blog`}>{L('ब्लॉग', 'Blog')}</Link></li>
              <li><a className="transition hover:text-white" href="#faq">{t('nav.faq')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-extrabold text-white">{L('सहायता', 'Support')}</h4>
            <ul className="grid gap-2 text-sm text-white/60">
              <li><Link className="transition hover:text-white" href={`/${locale}/contact`}>{L('संपर्क', 'Contact')}</Link></li>
              {/* Refund policy intentionally hidden from the footer for now — the /refund route itself still works for anyone who reaches it directly. */}
              <li><Link className="transition hover:text-white" href={`/${locale}/privacy`}>{L('गोपनीयता', 'Privacy')}</Link></li>
              <li><Link className="transition hover:text-white" href={`/${locale}/terms`}>{L('शर्तें', 'Terms')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 border-t border-white/10 px-4 py-4 text-xs text-white/50 sm:flex-row">
          <span>© 2026 RajyaRank · {L('उत्पाद समीक्षा हेतु।', 'For product review.')}</span>
          <span>{L('किसी सरकारी संस्था से संबद्ध नहीं।', 'Not affiliated with any government body.')}</span>
        </div>
      </footer>
    </main>
  );
}
