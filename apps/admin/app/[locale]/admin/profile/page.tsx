import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { Shell } from '@/components/Shell';
import { ProfileForm } from '@/components/ProfileForm';
import { TrustedDevicesManager, type TrustedDeviceView } from '@/components/TrustedDevicesManager';
import { roleLabel } from '@/lib/labels';
import type { ProfileResponse } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

function initialsOf(name: string | null): string {
  if (!name) return 'S';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'S';
}

const PLAN_STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-teal-100 text-success',
  TRIALING: 'bg-blue-100 text-blue-700',
  PAST_DUE: 'bg-orange-100 text-danger',
  CANCELED: 'bg-line text-muted',
};

export default async function ProfilePage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const me = await getMeOrRedirect(locale);
  const profile = await apiFetchServer<ProfileResponse>('/auth/me/profile', cookies().toString());
  const title = L('अकाउंट सेटिंग्स', 'Account settings');
  const isHead = me.roleKeys.includes('ACADEMIC_HEAD');
  const plan = profile?.institution?.plan ?? null;
  const trustedDevices = profile?.mfaEnabled
    ? ((await apiFetchServer<TrustedDeviceView[]>('/auth/trusted-devices', cookies().toString())) ?? [])
    : null;

  return (
    <Shell me={me} locale={locale} title={title}>
      {profile ? (
        <div className="grid gap-6">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="h-fit rounded-lg border border-line bg-white p-5 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 text-lg font-black text-white">
                {initialsOf(profile.displayName ?? profile.fullName)}
              </span>
              <div className="mt-3 text-base font-black text-navy-900">{profile.displayName || profile.fullName || L('स्टाफ़', 'Staff')}</div>
              {profile.title ? <div className="text-xs text-muted">{profile.title}</div> : null}
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {me.roleKeys.map((r) => (
                  <span key={r} className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-extrabold text-success">{roleLabel(r, locale)}</span>
                ))}
              </div>
              <div className="mt-4 grid gap-1 text-left text-xs text-muted">
                {profile.email ? <div>✉️ {profile.email}</div> : null}
                {profile.phone ? <div>📞 {profile.phone}</div> : null}
                {profile.institution ? <div>🏫 {profile.institution.name}</div> : null}
              </div>

              {isHead && profile.institution ? (
                <div className="mt-4 rounded-md border border-line bg-surface-soft p-3 text-left">
                  <div className="text-xs font-extrabold uppercase text-muted">{L('संस्थान एक्सेस कोड', 'Institution access code')}</div>
                  {profile.institution.accessCode ? (
                    <code className="mt-1 block rounded bg-white px-2 py-1.5 text-center text-sm font-black tracking-widest text-navy-900">
                      {profile.institution.accessCode}
                    </code>
                  ) : (
                    <p className="mt-1 text-xs text-muted">{L('अभी जारी नहीं। Super Admin से संपर्क करें।', 'Not issued yet — contact your Super Admin.')}</p>
                  )}
                  <p className="mt-1.5 text-[11px] leading-snug text-muted">
                    {L('यह कोड छात्रों को दें ताकि वे चेकआउट पर आपके संस्थान की कीमत पा सकें। यदि Super Admin इसे बदलते हैं, तो यहाँ हमेशा नया कोड दिखेगा।', "Share this with students so they unlock your institute's pricing at checkout. If your Super Admin rotates it, the new code always shows here.")}
                  </p>
                </div>
              ) : null}
            </aside>

            <section>
              <h2 className="mb-1 text-lg font-black text-navy-900">{L('व्यक्तिगत जानकारी', 'Personal information')}</h2>
              <p className="mb-4 text-sm text-muted">{L('अपनी व्यक्तिगत जानकारी अपडेट करें।', 'Update your personal information.')}</p>
              <ProfileForm initial={profile} locale={locale} />
            </section>
          </div>

          {isHead && profile.institution ? (
            <section className="rounded-lg border border-line bg-white p-5">
              <h2 className="mb-1 text-lg font-black text-navy-900">{L('आपके संस्थान की योजना', "Your institution's plan")}</h2>
              {plan ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-base font-extrabold text-navy-900">{hi ? plan.nameHi : plan.nameEn}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${PLAN_STATUS_TONE[plan.status] ?? 'bg-line text-muted'}`}>{plan.status}</span>
                    <span className="text-xs text-muted">
                      {plan.billingCycle === 'MONTHLY' ? L('मासिक बिलिंग', 'Billed monthly') : L('वार्षिक बिलिंग', 'Billed annually')}
                      {plan.currentPeriodEnd ? ` · ${L('अगली अवधि', 'renews')} ${plan.currentPeriodEnd.slice(0, 10)}` : ''}
                    </span>
                  </div>
                  <p className="mb-3 text-xs font-extrabold uppercase text-muted">{L('योजना लाभ', 'Plan benefits')}</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-md border border-line bg-surface-soft p-3">
                      <div className="text-xs font-extrabold uppercase text-muted">{L('सक्रिय छात्र सीमा', 'Active student limit')}</div>
                      <div className="mt-1 text-lg font-black text-navy-950">{plan.maxActiveStudents.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="rounded-md border border-line bg-surface-soft p-3">
                      <div className="text-xs font-extrabold uppercase text-muted">{L('स्टाफ़ सीटें', 'Staff seats')}</div>
                      <div className="mt-1 text-lg font-black text-navy-950">{plan.maxStaffSeats.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="rounded-md border border-line bg-surface-soft p-3">
                      <div className="text-xs font-extrabold uppercase text-muted">{L('स्टोरेज', 'Storage')}</div>
                      <div className="mt-1 text-lg font-black text-navy-950">{plan.storageGb} GB</div>
                    </div>
                    <div className="rounded-md border border-line bg-surface-soft p-3">
                      <div className="text-xs font-extrabold uppercase text-muted">{L('आंतरिक बिक्री शुल्क', 'Internal-sale fee')}</div>
                      <div className="mt-1 text-lg font-black text-navy-950">{(plan.internalFeeBps / 100).toFixed(1)}%</div>
                    </div>
                    <div className="rounded-md border border-line bg-surface-soft p-3">
                      <div className="text-xs font-extrabold uppercase text-muted">{L('बाहरी बिक्री शुल्क', 'External-sale fee')}</div>
                      <div className="mt-1 text-lg font-black text-navy-950">{(plan.externalFeeBps / 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">
                  {L('आपके संस्थान की अभी कोई सक्रिय योजना नहीं है। Super Admin से संपर्क करें।', 'Your institution has no active plan yet. Contact your Super Admin.')}
                </p>
              )}
            </section>
          ) : null}

          {trustedDevices ? <TrustedDevicesManager initial={trustedDevices} locale={locale} /> : null}
        </div>
      ) : (
        <p className="text-sm text-muted">{L('प्रोफ़ाइल लोड नहीं हो सकी।', 'Could not load your profile.')}</p>
      )}
    </Shell>
  );
}
