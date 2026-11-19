'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@rajyarank/ui';
import type { CustomTopicView, PersonalQuizView } from '@rajyarank/contracts';
import { apiFetch, type ApiError } from '@/lib/api';

const inputCls = 'mb-3 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500';

export function MyQuizzesList({
  initial,
  topics,
  initialTopicId,
  locale,
}: {
  initial: PersonalQuizView[];
  topics: CustomTopicView[];
  initialTopicId: string | null;
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  // No local mutation needed — a successful create() navigates straight to
  // the new quiz's own page instead of updating this list in place.
  const quizzes = initial;
  const [creating, setCreating] = useState(!!initialTopicId || initial.length === 0);
  const [title, setTitle] = useState('');
  const [topicId, setTopicId] = useState(initialTopicId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    if (!title.trim()) return setError(L('कृपया शीर्षक दर्ज करें।', 'Please enter a title.'));
    setBusy(true);
    try {
      const created = await apiFetch<PersonalQuizView>('/student/my-quizzes', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), customTopicId: topicId || undefined }),
      });
      // Straight into the new quiz's editor to start adding questions —
      // staying on the list would leave the student to click their own
      // just-created card, an extra step a live walkthrough caught as
      // genuinely awkward.
      router.push(`/${locale}/my-quizzes/${created.id}`);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  const topicById = new Map(topics.map((t) => [t.id, t]));

  return (
    <div className="grid gap-4">
      <div className="rounded-[15px] border border-line bg-white p-4">
        {creating ? (
          <div>
            <h2 className="mb-3 text-sm font-black text-navy-950">{L('नया प्रैक्टिस टेस्ट बनाएँ', 'Create a practice test')}</h2>
            <input className={inputCls} placeholder={L('शीर्षक, जैसे: राजनीति शास्त्र मूल बातें', 'Title, e.g. Polity Basics')} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            {topics.length ? (
              <select className={inputCls} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                <option value="">{L('किसी विषय से जोड़ें (वैकल्पिक)', 'Link to a topic (optional)')}</option>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            ) : null}
            {error ? <p className="mb-2 text-xs font-bold text-danger">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="button" loading={busy} onClick={() => void create()}>{L('बनाएँ', 'Create')}</Button>
              {quizzes.length ? (
                <button type="button" onClick={() => setCreating(false)} className="rounded-md px-3 py-2 text-xs font-bold text-muted hover:bg-surface-soft">
                  {L('रद्द करें', 'Cancel')}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setCreating(true)} className="rounded-md bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600">
            + {L('नया प्रैक्टिस टेस्ट', 'New practice test')}
          </button>
        )}
      </div>

      {quizzes.length === 0 && !creating ? (
        <p className="rounded-xl border border-line bg-white p-6 text-center text-sm text-muted">
          {L('अभी तक कोई प्रैक्टिस टेस्ट नहीं। अपना पहला टेस्ट बनाएँ।', "No practice tests yet — create your first one.")}
        </p>
      ) : (
        <div className="grid gap-2.5">
          {quizzes.map((q) => {
            const topic = q.customTopicId ? topicById.get(q.customTopicId) : null;
            return (
              <Link key={q.id} href={`/${locale}/my-quizzes/${q.id}`} className="flex items-center justify-between gap-3 rounded-[15px] border border-line bg-white p-4 hover:bg-surface-soft">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {topic ? <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[9px] font-black text-muted">{topic.name}</span> : null}
                    {q.bestScore !== null ? (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-black text-teal-600">{Math.round(q.bestScore)}% {L('सर्वश्रेष्ठ', 'best')}</span>
                    ) : null}
                  </div>
                  <div className="mt-1 truncate text-[14px] font-extrabold text-ink">{q.title}</div>
                  <div className="mt-0.5 text-[10.5px] text-muted">{q.questionCount} {L('सवाल', 'questions')}</div>
                </div>
                <span className="shrink-0 text-[11px] font-black text-orange-600">{L('खोलें', 'Open')} →</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
