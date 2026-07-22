import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';
import { MarkAllRead } from './mark-all-read';
import { EnablePush } from '@/components/EnablePush';
import type { NotificationView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

const CATEGORY_ICON: Record<string, string> = {
  DOUBT_ANSWER: '💬', CONTENT: '📄', TEST: '📝', PAYMENT: '💳', SUPPORT: '🎧', SECURITY: '🔒', SYSTEM: '📅',
};

export default async function NotificationsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login`);
  const items = (await apiFetchServer<NotificationView[]>('/student/notifications', cookie)) ?? [];
  const unread = items.filter((n) => !n.read).length;

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('सूचनाएँ', 'Notifications')} notifCount={unread}>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('सूचनाएँ', 'Notifications')}</h1>
          <p className="mt-1 text-sm text-muted">{L('कोर्स अपडेट, रिमाइंडर, परिणाम और शिक्षक उत्तर।', 'Course updates, reminders, results and educator responses.')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EnablePush locale={locale} />
          <MarkAllRead locale={locale} />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[18px] border border-line bg-white p-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-surface-soft text-2xl">🔔</div>
          <h3 className="mt-3.5 text-[15px] font-black text-navy-900">{L('कोई सूचना नहीं', 'No notifications')}</h3>
          <p className="mt-1 text-[10.5px] text-muted">{L('नई सूचनाएँ यहाँ दिखाई देंगी।', 'New notifications will appear here.')}</p>
        </div>
      ) : (
        <article className="max-w-3xl overflow-hidden rounded-[18px] border border-line bg-white shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
          {items.map((n) => (
            <div key={n.id} className={`grid grid-cols-[auto_1fr_auto] items-start gap-3 border-b border-[#edf2f5] p-4 last:border-0 ${n.read ? '' : 'bg-[#fffaf5]'}`}>
              <span className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-orange-100 text-orange-600">{CATEGORY_ICON[n.category] ?? '🔔'}</span>
              <div className="min-w-0">
                <h3 className="text-[11.5px] font-black text-navy-900">{hi ? n.titleHi : n.titleEn}</h3>
                {(hi ? n.bodyHi : n.bodyEn) ? <p className="mt-0.5 text-[9.5px] text-muted">{hi ? n.bodyHi : n.bodyEn}</p> : null}
              </div>
              <time className="whitespace-nowrap text-[8.5px] text-muted">{new Date(n.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}</time>
            </div>
          ))}
        </article>
      )}
    </StudentShell>
  );
}
