import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';

export const dynamic = 'force-dynamic';

interface FeatureCard { href: string; icon: string; nameHi: string; nameEn: string; descHi: string; descEn: string }
interface Group { titleHi: string; titleEn: string; items: FeatureCard[] }

const GROUPS: Group[] = [
  {
    titleHi: 'अपनी तैयारी की योजना बनाएँ',
    titleEn: 'Plan your prep',
    items: [
      { href: '/study-plan', icon: '🗺', nameHi: 'स्टडी प्लान', nameEn: 'Study Plan', descHi: 'कोई भी परीक्षा चुनें — कैटलॉग से या अपना नाम लिखकर — और अपने विषय जोड़कर एक दैनिक योजना बनवाएँ।', descEn: "Pick any exam — from the catalog or type your own — and get a day-by-day plan built from your own topics." },
      { href: '/live-classes', icon: '📹', nameHi: 'लाइव क्लासेस', nameEn: 'Live Classes', descHi: 'अपने संस्थान की शेड्यूल्ड लाइव क्लास में शामिल हों।', descEn: 'Join your institute\'s scheduled live sessions.' },
    ],
  },
  {
    titleHi: 'अभ्यास करें और खुद को परखें',
    titleEn: 'Practice & test yourself',
    items: [
      { href: '/my-quizzes', icon: '📝', nameHi: 'मेरे प्रैक्टिस टेस्ट', nameEn: 'My Practice Tests', descHi: 'अपने नोट्स से खुद के सवाल बनाएँ (या थोक में पेस्ट/अपलोड करें) और तुरंत स्कोर पाएँ।', descEn: 'Build your own questions from your notes (paste or upload them in bulk) and get scored instantly.' },
      { href: '/my-papers', icon: '📄', nameHi: 'मेरे पेपर', nameEn: 'My Papers', descHi: 'अपना कोई पिछले वर्ष का पेपर अपलोड करें और समय देकर अभ्यास करें।', descEn: 'Upload a previous-year paper you already have and practice it timed.' },
      { href: '/pyq', icon: '🕘', nameHi: 'पिछले वर्ष के प्रश्न', nameEn: 'Previous Year Questions', descHi: 'RajyaRank द्वारा सत्यापित असली परीक्षा पेपर।', descEn: "RajyaRank's own verified library of real past exam papers." },
      { href: '/tests', icon: '✅', nameHi: 'टेस्ट और अभ्यास', nameEn: 'Tests & Practice', descHi: 'आपके संस्थान द्वारा प्रकाशित मॉक टेस्ट (केवल संस्थान से जुड़े छात्रों के लिए)।', descEn: "Mock tests published by your institute (institute-affiliated students only)." },
    ],
  },
  {
    titleHi: 'प्रगति ट्रैक करें',
    titleEn: 'Track progress',
    items: [
      { href: '/revision', icon: '🔁', nameHi: 'रिवीज़न', nameEn: 'Revision', descHi: 'आपके कमज़ोर विषय — गलत जवाबों से अपने आप पता चलते हैं।', descEn: 'Your weak topics, surfaced automatically from wrong answers.' },
      { href: '/dashboard', icon: '📊', nameHi: 'डैशबोर्ड', nameEn: 'Dashboard', descHi: 'अध्ययन स्ट्रीक, साप्ताहिक लक्ष्य, और तैयारी स्कोर।', descEn: 'Study streak, weekly goal, and your readiness score.' },
    ],
  },
  {
    titleHi: 'कंटेंट',
    titleEn: 'Content',
    items: [
      { href: '/current-affairs', icon: '📰', nameHi: 'करंट अफेयर्स', nameEn: 'Current Affairs', descHi: 'रोज़ाना अपडेट, परीक्षा-केंद्रित।', descEn: 'Daily updates, written for exam relevance.' },
      { href: '/my-courses', icon: '📚', nameHi: 'मेरे कोर्स', nameEn: 'My Courses', descHi: 'आपके खरीदे या संस्थान से मिले कोर्स।', descEn: 'Courses you\'ve bought or received from your institute.' },
    ],
  },
  {
    titleHi: 'मदद लें',
    titleEn: 'Get help',
    items: [
      { href: '/doubts', icon: '❓', nameHi: 'मेरे सवाल', nameEn: 'My Doubts', descHi: 'कोई सवाल पूछें और जवाब पाएँ।', descEn: 'Ask a question and get it answered.' },
      { href: '/support', icon: '🎧', nameHi: 'सहायता और सपोर्ट', nameEn: 'Help & Support', descHi: 'सामान्य सवाल और संपर्क विकल्प।', descEn: 'FAQs and contact options.' },
    ],
  },
];

export default async function ExplorePage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/explore`)}`);

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('सभी सुविधाएँ', 'Explore features')} hasInstitute={Boolean(me.orgId)}>
      <div className="mb-6">
        <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('RajyaRank में क्या-क्या है', 'Everything in RajyaRank')}</h1>
        <p className="mt-1 text-sm text-muted">{L('हर सुविधा एक जगह — जो चाहिए वह खोलें।', 'Every feature in one place — open whatever you need.')}</p>
      </div>
      <div className="grid gap-8">
        {GROUPS.map((g) => (
          <section key={g.titleEn}>
            <h2 className="mb-3 text-[11px] font-black uppercase tracking-wide text-muted">{L(g.titleHi, g.titleEn)}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((f) => (
                <Link key={f.href} href={`/${locale}${f.href}`} className="flex items-start gap-3 rounded-[18px] border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-[0_7px_22px_rgba(6,29,49,0.06)]">
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-surface-soft text-xl">{f.icon}</span>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-extrabold text-navy-950">{L(f.nameHi, f.nameEn)}</div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{L(f.descHi, f.descEn)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </StudentShell>
  );
}
