import { resolveLocale } from '@/lib/i18n';
import { PublicHeader } from '@/components/PublicHeader';
import { MaintenanceAutoRefresh } from '@/components/MaintenanceAutoRefresh';

// Always rendered per-request (not statically baked at build time) — unlike
// NEXT_PUBLIC_* vars, these plain server-only env vars can change with just
// a restart/redeploy, and this page needs to reflect that immediately.
export const dynamic = 'force-dynamic';

interface TimelineStep {
  key: string;
  labelHi: string;
  labelEn: string;
  time: string | null;
  state: 'done' | 'active' | 'pending';
}

export default function MaintenancePage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const startedAt = process.env.MAINTENANCE_STARTED_AT || null;
  const expectedEndAt = process.env.MAINTENANCE_EXPECTED_END_AT || null;
  const customMessage = hi ? process.env.MAINTENANCE_MESSAGE_HI : process.env.MAINTENANCE_MESSAGE_EN;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(hi ? 'hi-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const steps: TimelineStep[] = [
    {
      key: 'started',
      labelHi: 'रखरखाव शुरू हुआ',
      labelEn: 'Maintenance started',
      time: startedAt ? fmt(startedAt) : null,
      state: 'done',
    },
    {
      key: 'in-progress',
      labelHi: 'कार्य जारी है',
      labelEn: 'Work in progress',
      time: null,
      state: 'active',
    },
    {
      key: 'expected-end',
      labelHi: 'वापस ऑनलाइन होने की उम्मीद',
      labelEn: 'Expected back online',
      time: expectedEndAt ? fmt(expectedEndAt) : null,
      state: 'pending',
    },
  ];

  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main" className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center md:py-24">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-3xl"
          aria-hidden
        >
          🛠️
        </span>
        <h1 className="mt-5 text-2xl font-black text-navy-950 md:text-3xl">
          {L('हम जल्द वापस आएंगे', "We'll be back soon")}
        </h1>
        <p className="mt-3 max-w-md text-muted">
          {customMessage ||
            L(
              'RajyaRank पर शेड्यूल्ड रखरखाव चल रहा है। हम सेवा को बेहतर बनाने के लिए काम कर रहे हैं — कृपया थोड़ी देर बाद पुनः जाँच करें।',
              "RajyaRank is undergoing scheduled maintenance. We're working to improve the service — please check back shortly.",
            )}
        </p>

        <ol className="mt-10 grid w-full gap-0 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.key} className="relative flex flex-1 flex-col items-center px-2 text-center sm:flex-row sm:text-left">
              <div className="flex items-center gap-2 sm:flex-col sm:items-center sm:gap-0">
                <span
                  className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black',
                    step.state === 'done' ? 'bg-teal-500 text-white' : '',
                    step.state === 'active' ? 'animate-pulse bg-orange-500 text-white' : '',
                    step.state === 'pending' ? 'border-2 border-line bg-white text-muted' : '',
                  ].join(' ')}
                  aria-hidden
                >
                  {step.state === 'done' ? '✓' : i + 1}
                </span>
                {i < steps.length - 1 ? (
                  <span className="h-px flex-1 bg-line sm:mt-4 sm:h-0.5 sm:w-full" aria-hidden />
                ) : null}
              </div>
              <div className="mt-2 sm:ml-3 sm:mt-4">
                <p className="text-sm font-extrabold text-navy-900">{hi ? step.labelHi : step.labelEn}</p>
                <p className="text-xs text-muted">{step.time ?? L('जल्द बताया जाएगा', 'To be announced')}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-sm text-muted">
          {L('यह पृष्ठ स्वतः रीफ़्रेश होता रहेगा।', 'This page will refresh automatically.')}
        </p>
        <MaintenanceAutoRefresh />
      </main>
    </>
  );
}
