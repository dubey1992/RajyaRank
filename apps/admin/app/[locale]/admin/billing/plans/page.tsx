import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { SubscriptionPlansManager } from '@/components/SubscriptionPlansManager';
import { StudentPlansManager } from '@/components/StudentPlansManager';
import { InstitutionBillingManager } from '@/components/InstitutionBillingManager';
import { TabbedSections, type TabSection } from '@/components/TabbedSections';
import type {
  SubscriptionPlanView,
  OrganizationSubscriptionView,
  InstitutionInvoiceView,
  OrganizationView,
  StudentPlanView,
  Exam,
} from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function ManagePlansPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'योजना प्रबंधन' : 'Manage Plans';

  const canInstitute = can(me, 'org.manage');
  const canStudent = can(me, 'payment.manage');
  if (!canInstitute && !canStudent) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="org.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [plans, subscriptions, invoices, orgs, studentPlans, exams] = await Promise.all([
    apiFetchServer<SubscriptionPlanView[]>('/admin/billing/plans', cookie),
    apiFetchServer<OrganizationSubscriptionView[]>('/admin/billing/subscriptions', cookie),
    apiFetchServer<InstitutionInvoiceView[]>('/admin/billing/invoices', cookie),
    apiFetchServer<OrganizationView[]>('/admin/organizations', cookie),
    apiFetchServer<StudentPlanView[]>('/admin/student-plans', cookie),
    apiFetchServer<Exam[]>('/exams', cookie),
  ]);

  const subscribedOrgIds = new Set((subscriptions ?? []).map((s) => s.orgId));
  // Only institutions whose invited Academic Head has actually accepted — a
  // still-pending invite means there's no one to run the institution yet.
  const unsubscribedOrgs = (orgs ?? [])
    .filter((o) => !subscribedOrgIds.has(o.id) && o.headName)
    .map((o) => ({ id: o.id, name: o.name }));
  const activePlans = (plans ?? []).filter((p) => p.active);

  const sections: TabSection[] = [];

  if (canInstitute) {
    sections.push({
      key: 'institute-plans',
      label: hi ? 'संस्थान योजनाएँ' : 'Institute Plans',
      content: (
        <>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            {hi
              ? 'यह संस्थान की सदस्यता योजनाओं की सूची है — छात्र/स्टाफ सीमा और छात्र लेन-देन पर मंच का हिस्सा।'
              : 'The institution subscription catalog — student/staff limits and the platform’s cut of student transactions.'}
          </p>
          <SubscriptionPlansManager initial={plans ?? []} locale={locale} />
        </>
      ),
    });
  }

  if (canStudent) {
    sections.push({
      key: 'student-plans',
      label: hi ? 'छात्र योजनाएँ' : 'Student Plans',
      content: (
        <>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            {hi
              ? 'छात्रों को सीधे बेची जाने वाली सदस्यता योजनाएँ — पूरी तरह मंच का राजस्व, कोई संस्थान हिस्सा नहीं लेता।'
              : 'Subscription plans sold directly to students — 100% platform revenue, no institution is ever party to this.'}
          </p>
          <StudentPlansManager initial={studentPlans ?? []} exams={exams ?? []} locale={locale} />
        </>
      ),
    });
  }

  if (canInstitute) {
    sections.push({
      key: 'billing',
      label: hi ? 'बिलिंग' : 'Billing',
      content: (
        <>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            {hi ? 'सदस्यता, चालान और भुगतान स्वास्थ्य।' : 'Subscriptions, invoices, and payment health.'}
          </p>
          <InstitutionBillingManager
            initialSubscriptions={subscriptions ?? []}
            initialInvoices={invoices ?? []}
            plans={activePlans}
            unsubscribedOrgs={unsubscribedOrgs}
            locale={locale}
          />
        </>
      ),
    });
  }

  return (
    <Shell me={me} locale={locale} title={title}>
      <TabbedSections sections={sections} />
    </Shell>
  );
}
