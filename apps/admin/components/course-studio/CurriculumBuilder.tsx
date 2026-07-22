'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ConfirmDialog, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { CreateContentWizard } from '../CreateContentWizard';
import { StatusBadge } from '../WorkflowActions';

interface Lesson { id: string; lessonType: string; currentVersion: { titleHi: string | null; titleEn: string | null; status: string } | null }
interface Topic { id: string; nameHi: string; nameEn: string; lessons: Lesson[] }
interface Chapter { id: string; nameHi: string; nameEn: string; topics: Topic[] }
export interface CurriculumSubject { id: string; nameHi: string; nameEn: string; chapters: Chapter[] }

const CHEVRON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 flex-none transition-transform">
    <path d="M9 6l6 6-6 6" />
  </svg>
);
const CARET_UP = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5"><path d="M12 6l6 8H6z" /></svg>
);
const CARET_DOWN = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5"><path d="M12 18l-6-8h12z" /></svg>
);
const PLUS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5"><path d="M12 5v14M5 12h14" /></svg>
);
const CROSS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
    <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12" />
  </svg>
);

/** Reorder controls for a sibling list — re-numbers every sibling on each
 *  move (not just a two-item swap) so it stays correct regardless of prior
 *  `sequence` values; every row created before this existed shares sequence
 *  0, which a plain swap could never fix. */
function ReorderButtons({ disabled, onUp, onDown, upLabel, downLabel }: { disabled: { up: boolean; down: boolean }; onUp: () => void; onDown: () => void; upLabel: string; downLabel: string }) {
  return (
    <span className="mr-0.5 flex flex-none flex-col gap-px">
      <button type="button" onClick={onUp} disabled={disabled.up} title={upLabel} aria-label={upLabel} className="grid h-3.5 w-4 place-items-center rounded text-muted hover:bg-surface-soft hover:text-ink disabled:opacity-30">
        {CARET_UP}
      </button>
      <button type="button" onClick={onDown} disabled={disabled.down} title={downLabel} aria-label={downLabel} className="grid h-3.5 w-4 place-items-center rounded text-muted hover:bg-surface-soft hover:text-ink disabled:opacity-30">
        {CARET_DOWN}
      </button>
    </span>
  );
}

/** "Add child" form — a single name field by default; the second language's
 *  field only appears once explicitly requested, since the backend already
 *  reuses one language for the other when left blank (so showing two
 *  required-looking boxes on every single add was pure friction). */
function AddForm({ label, placeholder, onAdd, autoFocus }: { label: string; placeholder: string; onAdd: (hi: string, en: string) => Promise<void>; autoFocus?: boolean }) {
  const [name, setName] = useState('');
  const [nameOther, setNameOther] = useState('');
  const [showOther, setShowOther] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    // The single field is authored in whichever language the user typed —
    // both nameHi/nameEn are sent so the backend's own hi-or-en fallback
    // still applies if the translation was never filled in.
    await onAdd(name.trim(), (nameOther || name).trim());
    setName(''); setNameOther(''); setShowOther(false); setBusy(false);
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-wrap items-center gap-1.5">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} className="min-w-[140px] rounded-md border border-line px-2 py-1.5 text-xs" />
      {showOther ? (
        <input value={nameOther} onChange={(e) => setNameOther(e.target.value)} placeholder={label} className="min-w-[140px] rounded-md border border-dashed border-line px-2 py-1.5 text-xs" />
      ) : (
        <button type="button" onClick={() => setShowOther(true)} className="rounded-md border border-dashed border-line px-2 py-1.5 text-[11px] font-bold text-muted hover:border-muted hover:text-ink">
          + {label}
        </button>
      )}
      <Button type="submit" variant="outline" loading={busy} className="min-h-[30px] px-2.5 text-xs">{PLUS}</Button>
    </form>
  );
}

/** Subject → Chapter → Topic → Lesson tree builder, with a "+ Add lesson"
 *  launcher per topic that opens CreateContentWizard pre-seeded with that
 *  topic's context. Shared between the legacy course-detail page
 *  (CourseTree.tsx) and the Course Studio's Curriculum step — one
 *  implementation, two call sites. Subjects/chapters collapse — the newest
 *  one opens automatically, everything else starts closed, so a large
 *  syllabus stays scannable instead of rendering as one very long page. */
export function CurriculumBuilder({
  courseId,
  courseTitleHi,
  courseTitleEn,
  subjects,
  locale,
  onChanged,
}: {
  courseId: string;
  courseTitleHi: string;
  courseTitleEn: string;
  subjects: CurriculumSubject[];
  locale: 'hi' | 'en';
  /** Called after any add/delete, in addition to router.refresh() — lets a
   *  purely client-state host (the Course Studio) re-sync without relying on
   *  a server-component parent page re-fetching props. */
  onChanged?: () => void;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const nm = (o: { nameHi: string; nameEn: string }) => (hi ? o.nameHi : o.nameEn);
  const router = useRouter();
  const [toast, setToast] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [del, setDel] = useState<{ title: string; message?: string; path: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(() => new Set(subjects.length === 1 ? [subjects[0]!.id] : []));
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSet(next);
  }

  async function add(path: string, hiName: string, enName: string, expand?: (id: string) => void) {
    try {
      const created = await apiFetch<{ id: string }>(`/admin/courses/${path}`, {
        method: 'POST',
        body: JSON.stringify({ nameHi: hiName || enName, nameEn: enName || hiName, sequence: 0 }),
      });
      expand?.(created.id);
      setToast({ text: L('जोड़ा गया।', 'Added.'), tone: 'success' });
      router.refresh();
      onChanged?.();
    } catch (e) {
      setToast({ text: (e as ApiError).message ?? 'Failed', tone: 'error' });
    }
  }

  /** Re-numbers every sibling in `list` after moving `id` one step up/down,
   *  and PATCHes each changed rank — see ReorderButtons' doc comment for why
   *  a full re-index beats a two-item swap here. */
  async function reorder<T extends { id: string }>(list: T[], id: string, direction: 'up' | 'down', kind: 'subjects' | 'chapters' | 'topics') {
    const idx = list.findIndex((x) => x.id === id);
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= list.length) return;
    const reordered = [...list];
    [reordered[idx], reordered[swapWith]] = [reordered[swapWith]!, reordered[idx]!];
    setBusy(true);
    try {
      await Promise.all(reordered.map((item, i) => apiFetch(`/admin/courses/${kind}/${item.id}`, { method: 'PATCH', body: JSON.stringify({ sequence: i }) })));
      router.refresh();
      onChanged?.();
    } catch (e) {
      setToast({ text: (e as ApiError).message ?? 'Failed', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!del) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/courses/${del.path}`, { method: 'DELETE' });
      setToast({ text: L('हटाया गया।', 'Deleted.'), tone: 'success' });
      router.refresh();
      onChanged?.();
    } catch (e) {
      setToast({ text: (e as ApiError).message ?? 'Failed', tone: 'error' });
    } finally {
      setBusy(false);
      setDel(null);
    }
  }

  // Cascades are real at the DB level (Subject→Chapter→Topic→Lesson all
  // cascade-delete) — computed from the tree already in props, so the
  // confirm dialog can say what else disappears, not just the item's name.
  function impact(counts: { chapters?: number; topics?: number; lessons?: number }): string | undefined {
    const parts: string[] = [];
    if (counts.chapters) parts.push(L(`${counts.chapters} अध्याय`, `${counts.chapters} chapter(s)`));
    if (counts.topics) parts.push(L(`${counts.topics} टॉपिक`, `${counts.topics} topic(s)`));
    if (counts.lessons) parts.push(L(`${counts.lessons} पाठ`, `${counts.lessons} lesson(s)`));
    if (!parts.length) return undefined;
    return L(`इससे यह भी हट जाएगा: ${parts.join(', ')}।`, `This also removes: ${parts.join(', ')}.`);
  }

  const delBtn = (title: string, message: string | undefined, path: string) => (
    <button type="button" onClick={() => setDel({ title, message, path })} className="grid h-6 w-6 flex-none place-items-center rounded text-muted hover:bg-orange-100/50 hover:text-danger">
      {CROSS}
    </button>
  );

  if (subjects.length === 0) {
    return (
      <div className="grid justify-items-center gap-3 rounded-lg border border-dashed border-line bg-surface-soft px-4 py-10 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-xl font-black text-orange-600">+</div>
        <h3 className="text-base font-black text-navy-900">{L('पहला विषय जोड़कर शुरू करें', 'Start with your first subject')}</h3>
        <p className="max-w-sm text-xs text-muted">
          {L('बाकी सब — अध्याय, टॉपिक, पाठ — विषय के भीतर बनते हैं। शुरू करने के लिए एक नाम दें।', 'Everything else — chapters, topics, lessons — nests inside a subject. Give it a name to begin.')}
        </p>
        <AddForm label={L('अंग्रेज़ी नाम', 'English name')} placeholder={L('विषय का नाम', 'Subject name')} autoFocus onAdd={(h, e) => add(`${courseId}/subjects`, h, e, (id) => setOpenSubjects(new Set([id])))} />
        <Toast message={toast?.text ?? null} tone={toast?.tone ?? 'success'} onDismiss={() => setToast(null)} />
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 rounded-md border border-dashed border-line bg-surface-soft px-3 py-2 text-xs text-muted">
        {L(
          'अपना सिलेबस यहाँ बनाएँ: पहले विषय जोड़ें, फिर उसके भीतर अध्याय, फिर हर अध्याय में टॉपिक। टॉपिक बनने के बाद, उसके नीचे "पाठ जोड़ें" से सीधे वीडियो, पीडीएफ़ या मॉक टेस्ट पाठ बनाएँ।',
          'Build your syllabus here: add a Subject, then Chapters within it, then Topics within each chapter. Once a topic exists, use "Add lesson" below it to create a video, PDF, or mock test lesson directly there.',
        )}
      </p>

      <div className="grid gap-3">
        {subjects.map((s, si) => {
          const sOpen = openSubjects.has(s.id);
          const topicCount = s.chapters.reduce((n, c) => n + c.topics.length, 0);
          const lessonCount = s.chapters.reduce((n, c) => n + c.topics.reduce((m, t) => m + t.lessons.length, 0), 0);
          return (
            <div key={s.id} className="rounded-lg border border-line border-l-[3px] border-l-navy-900 bg-white">
              <div className="flex items-center gap-2 p-3">
                <ReorderButtons
                  disabled={{ up: si === 0, down: si === subjects.length - 1 }}
                  onUp={() => void reorder(subjects, s.id, 'up', 'subjects')}
                  onDown={() => void reorder(subjects, s.id, 'down', 'subjects')}
                  upLabel={L('ऊपर ले जाएँ', 'Move up')}
                  downLabel={L('नीचे ले जाएँ', 'Move down')}
                />
                <button type="button" onClick={() => toggle(openSubjects, setOpenSubjects, s.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className={sOpen ? 'rotate-90 text-muted' : 'text-muted'}>{CHEVRON}</span>
                  <span className="truncate font-black text-navy-900">{nm(s)}</span>
                  <span className="flex-none text-xs text-muted">
                    {L(`${s.chapters.length} अध्याय · ${topicCount} टॉपिक · ${lessonCount} पाठ`, `${s.chapters.length} chapters · ${topicCount} topics · ${lessonCount} lessons`)}
                  </span>
                </button>
                {delBtn(
                  L('विषय हटाएँ?', 'Delete subject?'),
                  `${nm(s)}${impact({ chapters: s.chapters.length, topics: topicCount, lessons: lessonCount }) ? ' — ' + impact({ chapters: s.chapters.length, topics: topicCount, lessons: lessonCount }) : ''}`,
                  `subjects/${s.id}`,
                )}
              </div>

              {sOpen ? (
                <div className="grid gap-2 border-t border-line p-3 pl-6">
                  {s.chapters.map((c, ci) => {
                    const cOpen = openChapters.has(c.id);
                    const cLessonCount = c.topics.reduce((n, t) => n + t.lessons.length, 0);
                    return (
                      <div key={c.id} className="rounded-md border border-line border-l-[3px] border-l-orange-500 bg-surface-soft">
                        <div className="flex items-center gap-2 p-2.5">
                          <ReorderButtons
                            disabled={{ up: ci === 0, down: ci === s.chapters.length - 1 }}
                            onUp={() => void reorder(s.chapters, c.id, 'up', 'chapters')}
                            onDown={() => void reorder(s.chapters, c.id, 'down', 'chapters')}
                            upLabel={L('ऊपर ले जाएँ', 'Move up')}
                            downLabel={L('नीचे ले जाएँ', 'Move down')}
                          />
                          <button type="button" onClick={() => toggle(openChapters, setOpenChapters, c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                            <span className={cOpen ? 'rotate-90 text-muted' : 'text-muted'}>{CHEVRON}</span>
                            <span className="truncate text-sm font-extrabold text-ink">{nm(c)}</span>
                            <span className="flex-none text-xs text-muted">{L(`${c.topics.length} टॉपिक`, `${c.topics.length} topics`)}</span>
                          </button>
                          {delBtn(
                            L('अध्याय हटाएँ?', 'Delete chapter?'),
                            `${nm(c)}${impact({ topics: c.topics.length, lessons: cLessonCount }) ? ' — ' + impact({ topics: c.topics.length, lessons: cLessonCount }) : ''}`,
                            `chapters/${c.id}`,
                          )}
                        </div>

                        {cOpen ? (
                          <div className="grid gap-2 border-t border-line bg-white p-2.5 pl-6">
                            {c.topics.map((t, ti) => (
                              <div key={t.id} className="rounded border border-line border-l-[3px] border-l-teal-600 p-2.5">
                                <div className="flex items-center gap-2">
                                  <ReorderButtons
                                    disabled={{ up: ti === 0, down: ti === c.topics.length - 1 }}
                                    onUp={() => void reorder(c.topics, t.id, 'up', 'topics')}
                                    onDown={() => void reorder(c.topics, t.id, 'down', 'topics')}
                                    upLabel={L('ऊपर ले जाएँ', 'Move up')}
                                    downLabel={L('नीचे ले जाएँ', 'Move down')}
                                  />
                                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{nm(t)}</span>
                                  <span className="flex-none text-xs text-muted">{L(`${t.lessons.length} पाठ`, `${t.lessons.length} lesson(s)`)}</span>
                                  {delBtn(L('टॉपिक हटाएँ?', 'Delete topic?'), `${nm(t)}${impact({ lessons: t.lessons.length }) ? ' — ' + impact({ lessons: t.lessons.length }) : ''}`, `topics/${t.id}`)}
                                </div>

                                {t.lessons.length ? (
                                  <ul className="mt-2 grid gap-1.5 pl-6">
                                    {t.lessons.map((l) => (
                                      <li key={l.id} className="flex items-center gap-2 rounded bg-surface-soft px-2 py-1.5 text-xs">
                                        <span className="truncate font-bold text-ink">{(hi ? l.currentVersion?.titleHi : l.currentVersion?.titleEn) ?? l.lessonType}</span>
                                        <span className="ml-auto flex-none"><StatusBadge status={l.currentVersion?.status ?? '—'} /></span>
                                        {delBtn(L('पाठ हटाएँ?', 'Delete lesson?'), (hi ? l.currentVersion?.titleHi : l.currentVersion?.titleEn) ?? l.lessonType, `lessons/${l.id}`)}
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}

                                <div className="mt-2 pl-6">
                                  <CreateContentWizard
                                    locale={locale}
                                    triggerLabel={`+ ${L('पाठ जोड़ें', 'Add lesson')}`}
                                    triggerVariant="outline"
                                    triggerClassName="min-h-[32px] gap-1.5 border-dashed border-navy-900/30 px-2.5 text-[11px] font-extrabold"
                                    onCreated={onChanged}
                                    context={{
                                      courseId,
                                      courseTitleHi,
                                      courseTitleEn,
                                      subjectId: s.id,
                                      chapterId: c.id,
                                      topicId: t.id,
                                      topicNameHi: t.nameHi,
                                      topicNameEn: t.nameEn,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                            {c.topics.length === 0 ? <p className="text-xs text-muted">{L('कोई टॉपिक नहीं', 'No topics yet')}</p> : null}
                            <AddForm label={L('अंग्रेज़ी नाम', 'English name')} placeholder={L('नया टॉपिक', 'New topic name')} onAdd={(h, e) => add(`chapters/${c.id}/topics`, h, e)} />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {s.chapters.length === 0 ? <p className="text-xs text-muted">{L('कोई अध्याय नहीं', 'No chapters yet')}</p> : null}
                  <AddForm label={L('अंग्रेज़ी नाम', 'English name')} placeholder={L('नया अध्याय', 'New chapter name')} onAdd={(h, e) => add(`subjects/${s.id}/chapters`, h, e, (id) => setOpenChapters((prev) => new Set(prev).add(id)))} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-line p-3">
        <span className="mr-2 text-sm font-extrabold text-navy-900">{L('विषय जोड़ें', 'Add subject')}:</span>
        <span className="inline-block"><AddForm label={L('अंग्रेज़ी नाम', 'English name')} placeholder={L('विषय का नाम', 'Subject name')} onAdd={(h, e) => add(`${courseId}/subjects`, h, e, (id) => setOpenSubjects((prev) => new Set(prev).add(id)))} /></span>
      </div>

      <ConfirmDialog
        open={!!del}
        title={del?.title ?? L('हटाएँ?', 'Delete?')}
        message={del?.message}
        confirmLabel={L('हटाएँ', 'Delete')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        tone="danger"
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDel(null)}
      />
      <Toast message={toast?.text ?? null} tone={toast?.tone ?? 'success'} onDismiss={() => setToast(null)} />
    </div>
  );
}
