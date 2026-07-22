import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { BlogManager } from '@/components/BlogManager';
import type { BlogPostSummary } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function BlogPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'ब्लॉग' : 'Blog';

  if (!can(me, 'marketing.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="marketing.manage" />
      </Shell>
    );
  }

  const posts = (await apiFetchServer<BlogPostSummary[]>('/admin/blog', cookies().toString())) ?? [];

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi
          ? 'प्रचार व SEO के लिए ब्लॉग लेख लिखें व प्रकाशित करें। केवल "प्रकाशित" लेख ही सार्वजनिक रूप से दिखते हैं।'
          : 'Write and publish blog posts for promotion and SEO. Only published posts are shown publicly.'}
      </p>
      <BlogManager initial={posts} locale={locale} />
    </Shell>
  );
}
