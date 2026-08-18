import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { DoubtPanel } from '@/components/DoubtPanel';
import type { DoubtView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

/** Staff queue for doubts students raise while reading a lesson (see
 *  AskDoubtModal on the web app). Gated on doubt.respond specifically, not
 *  support.manage — Teacher/Content Admin/Academic Reviewer hold the former
 *  but not the latter, and still need to reach their own queue. */
export default async function DoubtsQueuePage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);

  if (!can(me, 'doubt.respond')) {
    return (
      <Shell me={me} locale={locale} title="Doubt Queue">
        <AccessDenied locale={locale} permission="doubt.respond" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const doubts = (await apiFetchServer<DoubtView[]>('/staff/doubts', cookie)) ?? [];

  return (
    <Shell me={me} locale={locale} title={hi ? 'शंका समाधान' : 'Doubt Queue'}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi
          ? 'छात्रों द्वारा पाठ पढ़ते समय पूछे गए सवाल — यहाँ उत्तर दें और समाधान करें।'
          : 'Doubts students raised while reading a lesson — reply and resolve them here.'}
      </p>
      {doubts.length === 0 ? (
        <p className="text-sm text-muted">{hi ? 'कतार में कोई सवाल नहीं है।' : 'No doubts in the queue.'}</p>
      ) : (
        <div className="grid gap-3">
          {doubts.map((d) => (
            <DoubtPanel key={d.id} doubt={d} locale={locale} />
          ))}
        </div>
      )}
    </Shell>
  );
}
