import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { MeResponse } from '@rajyarank/contracts';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { StudentShell } from '@/components/StudentShell';

export const dynamic = 'force-dynamic';

function initialsOf(name: string | null): string {
  if (!name) return 'S';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'S';
}

export default async function SupportPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const me = await apiFetchServer<MeResponse>('/auth/me', cookies().toString());
  if (!me) redirect(`/${locale}/login`);

  const channels = [
    { icon: '📖', tone: 'bg-orange-100 text-orange-600', h: L('हेल्प सेंटर', 'Help centre'), p: L('कोर्स, टेस्ट, भुगतान और अकाउंट सेटिंग्स के लिए गाइड।', 'Guides for courses, tests, payments and account settings.') },
    { icon: '💬', tone: 'bg-teal-100 text-teal-600', h: L('चैट सपोर्ट', 'Chat support'), p: L('सोम–शनि, सुबह 9 से शाम 7 बजे तक उपलब्ध।', 'Available Monday–Saturday, 9:00 AM–7:00 PM.') },
    { icon: '📞', tone: 'bg-navy-100 text-navy-800', h: L('कॉल सपोर्ट', 'Call support'), p: L('लॉगिन या भुगतान-एक्सेस की तत्काल समस्याओं के लिए।', 'For urgent login or payment-access issues.') },
  ];
  const faqs = [
    { q: L('ऑफ़लाइन अध्ययन के लिए PDF कैसे डाउनलोड करें?', 'How do I download a PDF for offline study?'), a: L('पाठ खोलें, संसाधन चुनें, और जहाँ अनुमति हो वहाँ डाउनलोड चुनें।', 'Open the lesson, select Resources, and choose Download where your course permits offline access.') },
    { q: L('कोर्स एक्सेस समाप्त होने पर क्या होता है?', 'What happens when my course access expires?'), a: L('सुरक्षित पाठ और टेस्ट अनुपलब्ध हो जाते हैं, पर आपका अकाउंट और खरीद इतिहास बना रहता है।', 'Protected lessons and tests become unavailable, but your account and purchase history remain accessible.') },
    { q: L('क्या एक ही अकाउंट दूसरे डिवाइस पर उपयोग कर सकते हैं?', 'Can I use the same account on another device?'), a: L('हाँ, आपके प्लान की डिवाइस-सीमा के भीतर। संदिग्ध उपयोग पर सत्यापन माँगा जा सकता है।', 'Yes, within the device limits applicable to your plan. Suspicious simultaneous use may trigger verification.') },
  ];

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('सहायता केंद्र', 'Help centre')}>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('सहायता और सपोर्ट', 'Help & Support')}</h1>
          <p className="mt-1 text-sm text-muted">{L('उत्तर पाएँ या हमारी स्टूडेंट-सपोर्ट टीम से संपर्क करें।', 'Find answers or contact our student-support team.')}</p>
        </div>
        <Link href={`/${locale}/doubts`} className="inline-flex min-h-[42px] items-center gap-2 self-start rounded-xl bg-orange-500 px-4 text-xs font-extrabold text-white shadow-[0_9px_20px_rgba(245,116,23,0.2)] transition hover:-translate-y-0.5 hover:bg-orange-600">
          + {L('डाउट पूछें', 'Ask a doubt')}
        </Link>
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        {channels.map((c) => (
          <article key={c.h} className="rounded-[18px] border border-line bg-white p-5 text-center shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
            <span className={`mx-auto grid h-[46px] w-[46px] place-items-center rounded-[15px] text-xl ${c.tone}`}>{c.icon}</span>
            <h3 className="mt-3 text-sm font-black text-navy-900">{c.h}</h3>
            <p className="mt-1 text-[10.5px] text-muted">{c.p}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[18px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
        <h2 className="mb-4 text-base font-black tracking-tight text-navy-950">{L('अक्सर पूछे जाने वाले प्रश्न', 'Frequently asked questions')}</h2>
        <div className="grid gap-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-md border border-line">
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-[13px] font-extrabold text-navy-900 [&::-webkit-details-marker]:hidden">
                <span>{f.q}</span>
                <span className="text-lg text-orange-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="px-4 pb-3.5 text-[11.5px] text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </StudentShell>
  );
}
