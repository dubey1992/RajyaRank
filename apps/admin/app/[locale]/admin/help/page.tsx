import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

/** Staff-facing self-service help — deliberately ungated by any permission
 *  (unlike /admin/support, which is the support-ticket queue and requires
 *  support.manage). Every authenticated staff member needs somewhere to land
 *  from the profile menu's "Help & Support" link, regardless of role. */
export default async function AdminHelpPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const me = await getMeOrRedirect(locale);
  const title = L('सहायता और सपोर्ट', 'Help & Support');

  const channels = [
    { icon: '📖', h: L('स्टाफ़ गाइड', 'Staff guides'), p: L('अपनी भूमिका के लिए दस्तावेज़ीकरण देखें।', 'See the documentation for your role.') },
    { icon: '👤', h: L('अपने Super Admin से संपर्क करें', 'Contact your Super Admin'), p: L('अनुमतियों, भूमिका या खाता समस्याओं के लिए।', 'For permissions, role, or account issues.') },
    { icon: '✉️', h: L('ईमेल सपोर्ट', 'Email support'), p: 'support@rajyarank.in' },
  ];
  const faqs = [
    { q: L('मुझे और अनुमतियाँ (जैसे नया मेनू) कैसे मिलेंगी?', 'How do I get more permissions (e.g. a new menu item)?'), a: L('यह आपके Super Admin द्वारा "भूमिकाएँ व अनुमतियाँ" स्क्रीन से नियंत्रित होता है — उनसे अनुरोध करें।', 'This is controlled by your Super Admin from the "Roles & Permissions" screen — request it from them.') },
    { q: L('मेरा पासवर्ड कैसे रीसेट करूँ?', 'How do I reset my password?'), a: L('लॉगिन पेज पर "पासवर्ड भूल गए" पर क्लिक करें, या अपने Super Admin से रीसेट अनुरोध करें।', 'Use "Forgot password?" on the login page, or ask your Super Admin to force a reset.') },
    { q: L('मेरा दो-चरणीय सत्यापन (MFA) काम नहीं कर रहा है।', 'My two-factor authentication (MFA) isn’t working.'), a: L('अपने Super Admin से संपर्क करें — वे आपके सत्र रीसेट कर सकते हैं ताकि आप पुनः सेटअप कर सकें।', 'Contact your Super Admin — they can revoke your sessions so you can re-enrol.') },
  ];

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        {L('उत्तर पाएँ या अपनी संस्था की सहायता टीम से संपर्क करें।', 'Find answers or get in touch with your organization’s support contacts.')}
      </p>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        {channels.map((c) => (
          <article key={c.h} className="rounded-lg border border-line bg-white p-5 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-surface-soft text-xl">{c.icon}</span>
            <h3 className="mt-3 text-sm font-black text-navy-900">{c.h}</h3>
            <p className="mt-1 text-xs text-muted">{c.p}</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-4 text-base font-black text-navy-950">{L('अक्सर पूछे जाने वाले प्रश्न', 'Frequently asked questions')}</h2>
        <div className="grid gap-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-md border border-line">
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-extrabold text-navy-900 [&::-webkit-details-marker]:hidden">
                <span>{f.q}</span>
                <span className="text-lg text-orange-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="px-4 pb-3.5 text-xs text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </Shell>
  );
}
