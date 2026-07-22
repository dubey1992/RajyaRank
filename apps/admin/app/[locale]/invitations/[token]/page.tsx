import { resolveLocale, getT } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import type { InvitationPreview } from '@rajyarank/contracts';
import { AcceptForm } from './accept-form';

export default async function InvitationAcceptPage({
  params,
}: {
  params: { locale: string; token: string };
}) {
  const locale = resolveLocale(params.locale);
  const t = getT(locale);
  const preview = await apiFetchServer<InvitationPreview>(`/staff/invitations/${params.token}`, '');

  if (!preview) {
    return (
      <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <h1 className="text-xl font-black text-navy-950">{t('invitation.invalid')}</h1>
        <p className="mt-2 text-sm text-muted">{t('invitation.expired')}</p>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-black text-navy-950">{t('invitation.title')}</h1>
      <p className="mb-6 text-sm text-muted">
        {t('invitation.invitedAs')} <strong>{preview.roleKey}</strong> — {preview.email}
      </p>
      <AcceptForm token={params.token} locale={locale} />
    </main>
  );
}

export const dynamic = 'force-dynamic';
