import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';
import { ProfileForm } from '@/components/ProfileForm';
import { StudyGoalsForm } from '@/components/StudyGoalsForm';
import { JoinInstitutionForm } from '@/components/JoinInstitutionForm';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import type { EntitlementView, ProfileResponse, StudyGoals } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

interface OrderView { id: string; status: string; amountMinor: number; product: string; createdAt: string }

export default async function AccountPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login`);

  const [entitlements, orders, profile, goals] = await Promise.all([
    apiFetchServer<EntitlementView[]>('/student/entitlements', cookie),
    apiFetchServer<OrderView[]>('/student/orders', cookie),
    apiFetchServer<ProfileResponse>('/auth/me/profile', cookie),
    apiFetchServer<StudyGoals>('/student/profile/goals', cookie),
  ]);
  const activeEntitlement = (entitlements ?? []).find((e) => e.status === 'ACTIVE') ?? (entitlements ?? [])[0];

  return (
    <StudentShell
      locale={locale}
      name={me.displayName ?? L('विद्यार्थी', 'Student')}
      initials={initialsOf(me.displayName)}
      target={L('प्रोफ़ाइल व सेटिंग्स', 'Profile & Settings')}
      activeEntitlementEndsAt={activeEntitlement?.endsAt ?? null}
    >
      <div className="mb-6">
        <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('प्रोफ़ाइल व सेटिंग्स', 'Profile & Settings')}</h1>
        <p className="mt-1 text-sm text-muted">{L('अपना अकाउंट, अध्ययन प्राथमिकताएँ और सूचनाएँ प्रबंधित करें।', 'Manage your account, study preferences and notifications.')}</p>
      </div>

      <div className="grid gap-[18px] lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Profile card */}
        <aside className="rounded-[18px] border border-line bg-white p-6 text-center shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
          <div className="mx-auto grid h-[86px] w-[86px] place-items-center rounded-[27px] bg-gradient-to-br from-orange-500 to-orange-100 text-[26px] font-black text-white">{initialsOf(me.displayName)}</div>
          <h2 className="mt-3 text-lg font-black text-navy-950">{me.displayName ?? L('विद्यार्थी', 'Student')}</h2>
          <p className="text-[10.5px] text-muted">{profile?.email ?? profile?.phone ?? ''}</p>
          {profile?.institution ? (
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-navy-100 px-3 py-1.5 text-[10px] font-extrabold text-navy-800">
              🏛 {profile.institution.name}
            </div>
          ) : null}
          <span className="mt-3 block"><span className="inline-flex rounded-full bg-teal-100 px-2.5 py-1 text-[9px] font-black text-teal-600">{L('सत्यापित विद्यार्थी', 'VERIFIED STUDENT')}</span></span>
          {activeEntitlement ? (
            <div className="mt-4 rounded-xl bg-surface-soft p-3 text-left text-[10.5px]">
              <div className="flex items-center justify-between"><span className="text-muted">{L('प्लान', 'Plan')}</span><strong className={activeEntitlement.status === 'ACTIVE' ? 'text-success' : 'text-ink'}>{activeEntitlement.status}</strong></div>
              {activeEntitlement.endsAt ? <div className="mt-1 flex items-center justify-between"><span className="text-muted">{L('वैध तक', 'Valid till')}</span><strong>{activeEntitlement.endsAt.slice(0, 10)}</strong></div> : null}
            </div>
          ) : null}
        </aside>

        {/* Right column */}
        <div className="grid gap-[16px]">
          <section className="rounded-[18px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
            <h2 className="mb-4 text-base font-black tracking-tight text-navy-950">{L('व्यक्तिगत जानकारी', 'Personal information')}</h2>
            {profile ? <ProfileForm initial={profile} locale={locale} /> : <p className="text-sm text-muted">{L('प्रोफ़ाइल लोड नहीं हो सकी।', 'Could not load your profile.')}</p>}
          </section>

          <section className="rounded-[18px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
            <h2 className="mb-3 text-base font-black tracking-tight text-navy-950">{L('संस्थान सदस्यता', 'Institution membership')}</h2>
            <JoinInstitutionForm locale={locale} institution={profile?.institution ?? null} />
          </section>

          <section className="rounded-[18px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
            <h2 className="mb-1 text-base font-black tracking-tight text-navy-950">{L('अध्ययन लक्ष्य', 'Study goals')}</h2>
            <p className="mb-4 text-xs text-muted">{L('अपनी लक्ष्य परीक्षा, दैनिक अध्ययन समय व तिथि कभी भी बदलें।', 'Change your target exam, daily study time, or target date any time.')}</p>
            {goals ? <StudyGoalsForm initial={goals} locale={locale} /> : <p className="text-sm text-muted">{L('लक्ष्य लोड नहीं हो सके।', 'Could not load goals.')}</p>}
          </section>

          {profile?.hasPassword ? (
            <section className="rounded-[18px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
              <h2 className="mb-3 text-base font-black tracking-tight text-navy-950">{L('पासवर्ड', 'Password')}</h2>
              <ChangePasswordForm locale={locale} />
            </section>
          ) : null}

          <section className="rounded-[18px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
            <h2 className="mb-3 text-base font-black tracking-tight text-navy-950">{L('मेरी सदस्यताएँ', 'My entitlements')}</h2>
            {(entitlements ?? []).length === 0 ? (
              <p className="text-sm text-muted">{L('अभी कोई सक्रिय सदस्यता नहीं।', 'No active entitlements yet.')}</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {(entitlements ?? []).map((e) => (
                  <li key={e.id} className="flex items-center justify-between rounded-xl border border-line bg-white p-3">
                    <span className="text-[12px]">
                      {e.productKind === 'SUBSCRIPTION' ? (
                        <>
                          <strong>{L('सक्रिय प्लान: ', 'Active plan: ')}</strong>
                          {hi ? e.productTitleHi : e.productTitleEn}
                        </>
                      ) : (
                        `${hi ? e.productTitleHi : e.productTitleEn} · ${e.accessType}`
                      )}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${e.status === 'ACTIVE' ? 'bg-teal-100 text-success' : 'bg-line text-ink'}`}>
                      {e.status}{e.endsAt ? ` · ${L('तक', 'till')} ${e.endsAt.slice(0, 10)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[18px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
            <h2 className="mb-3 text-base font-black tracking-tight text-navy-950">{L('ऑर्डर इतिहास', 'Order history')}</h2>
            {!orders || orders.length === 0 ? (
              <p className="text-sm text-muted">{L('कोई ऑर्डर नहीं।', 'No orders yet.')}</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between rounded-xl border border-line bg-white p-3">
                    <span className="text-[12px]">{o.product} · ₹{(o.amountMinor / 100).toLocaleString('en-IN')}</span>
                    <span className="text-[11px] text-muted">{o.status} · {o.createdAt.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </StudentShell>
  );
}
