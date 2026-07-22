import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Renders blog-post Markdown with hand-tuned typography — no Tailwind
 *  typography plugin is installed in this repo, so heading/paragraph/list
 *  spacing is set explicitly via `[&_x]` descendant selectors, matching the
 *  pattern already used by LegalPageLayout for the Terms/Privacy/Refund pages. */
export function MarkdownBody({ children }: { children: string }) {
  return (
    <div
      className="max-w-none text-[17px] leading-[1.8] text-ink
        [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:text-navy-950
        [&_h3]:mb-2 [&_h3]:mt-7 [&_h3]:text-xl [&_h3]:font-extrabold [&_h3]:text-navy-900
        [&_p]:mb-5 [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6
        [&_li]:mb-1.5 [&_li]:leading-[1.8]
        [&_a]:font-bold [&_a]:text-orange-600 [&_a]:underline [&_a]:decoration-orange-300 [&_a]:underline-offset-2 hover:[&_a]:decoration-orange-500
        [&_strong]:font-extrabold [&_strong]:text-navy-950
        [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-orange-400 [&_blockquote]:bg-surface-soft [&_blockquote]:py-2 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-navy-900
        [&_code]:rounded [&_code]:bg-surface-soft [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-navy-900
        [&_pre]:mb-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-navy-950 [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-white [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit
        [&_hr]:my-8 [&_hr]:border-line
        [&_img]:my-6 [&_img]:rounded-lg [&_img]:border [&_img]:border-line
        [&_table]:mb-5 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
        [&_th]:border [&_th]:border-line [&_th]:bg-surface-soft [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-extrabold
        [&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-2"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
