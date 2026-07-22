import { apiFetchServer } from '@/lib/api';
import { resolveLocale } from '@/lib/i18n';
import type { BlogPostSummary } from '@rajyarank/contracts';

const SITE = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET(_req: Request, { params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const posts = (await apiFetchServer<BlogPostSummary[]>('/blog', '')) ?? [];

  const items = posts
    .map((p) => {
      const title = hi ? p.titleHi : p.titleEn;
      const description = hi ? p.excerptHi : p.excerptEn;
      const url = `${SITE}/${locale}/blog/${p.slug}`;
      const pubDate = new Date(p.publishedAt ?? p.createdAt).toUTCString();
      return `  <item>
    <title>${escapeXml(title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <description>${escapeXml(description)}</description>
    <author>${escapeXml(p.authorName)}</author>
    <category>${escapeXml(p.category)}</category>
    <pubDate>${pubDate}</pubDate>
  </item>`;
    })
    .join('\n');

  const channelTitle = hi ? 'RajyaRank ब्लॉग' : 'RajyaRank Blog';
  const channelDescription = hi
    ? 'परीक्षा रणनीति, सिलेबस गाइड और तैयारी टिप्स।'
    : 'Exam strategy, syllabus guides, and preparation tips.';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(channelTitle)}</title>
  <link>${SITE}/${locale}/blog</link>
  <description>${escapeXml(channelDescription)}</description>
  <language>${locale}</language>
${items}
</channel>
</rss>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
