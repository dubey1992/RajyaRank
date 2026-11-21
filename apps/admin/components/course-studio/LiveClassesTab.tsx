'use client';
import { useEffect, useState } from 'react';
import { Alert, Button, Field, Card, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { LiveClassView, LiveClassAttendanceRow, StaffListItem } from '@rajyarank/contracts';
import type { CurriculumSubject } from './CurriculumBuilder';

interface BatchRef { id: string; code: string; nameHi: string; nameEn: string }

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FormState {
  id: string | null;
  titleHi: string;
  titleEn: string;
  descriptionHi: string;
  descriptionEn: string;
  startsAtLocal: string;
  durationMinutes: string;
  youtubeUrlOrId: string;
  batchId: string;
  coHostUserId: string;
  // Create-only convenience — see CreateLiveClassInput's own comment on why
  // this isn't a true recurring-series model.
  repeatEnabled: boolean;
  repeatFrequency: 'DAILY' | 'WEEKLY';
  repeatUntilLocal: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  titleHi: '',
  titleEn: '',
  descriptionHi: '',
  descriptionEn: '',
  startsAtLocal: '',
  durationMinutes: '60',
  youtubeUrlOrId: '',
  batchId: '',
  coHostUserId: '',
  repeatEnabled: false,
  repeatFrequency: 'WEEKLY',
  repeatUntilLocal: '',
};

/** Course Studio step 7 — schedule/edit/cancel YouTube-Live classes for this
 *  course, and view per-class attendance. Self-contained like
 *  CoursePricingPanel/CurriculumBuilder: fetches its own data, mounted only
 *  once a courseId exists. */
export function LiveClassesTab({ courseId, subjects, batches, locale }: { courseId: string; subjects: CurriculumSubject[]; batches: BatchRef[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const topics = subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics.map((t) => ({ id: t.id, nameHi: `${s.nameHi} / ${c.nameHi} / ${t.nameHi}`, nameEn: `${s.nameEn} / ${c.nameEn} / ${t.nameEn}` }))));

  const [classes, setClasses] = useState<LiveClassView[] | null>(null);
  const [staff, setStaff] = useState<StaffListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [attendanceFor, setAttendanceFor] = useState<{ id: string; rows: LiveClassAttendanceRow[] } | null>(null);
  const [publishFor, setPublishFor] = useState<string | null>(null);
  const [publishTopicId, setPublishTopicId] = useState('');

  function load() {
    apiFetch<LiveClassView[]>(`/admin/live-classes?courseId=${courseId}`).then(setClasses).catch((e: ApiError) => setError(e.message));
  }
  useEffect(load, [courseId]);
  useEffect(() => {
    // Co-host picker is informational only (Phase 7) — a Content Admin
    // without the staff-list permission simply won't see the option rather
    // than breaking the rest of this tab.
    apiFetch<StaffListItem[]>('/admin/staff').then(setStaff).catch(() => setStaff([]));
  }, []);

  function openCreate() {
    setForm({ ...EMPTY_FORM });
  }
  function openEdit(c: LiveClassView) {
    setForm({
      ...EMPTY_FORM,
      id: c.id,
      titleHi: c.titleHi,
      titleEn: c.titleEn,
      descriptionHi: c.descriptionHi ?? '',
      descriptionEn: c.descriptionEn ?? '',
      startsAtLocal: toLocalInputValue(c.startsAt),
      durationMinutes: String(c.durationMinutes),
      youtubeUrlOrId: c.embedUrl,
      batchId: c.batchId ?? '',
      coHostUserId: c.coHostUserId ?? '',
    });
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = {
      titleHi: form.titleHi,
      titleEn: form.titleEn,
      descriptionHi: form.descriptionHi || undefined,
      descriptionEn: form.descriptionEn || undefined,
      startsAt: new Date(form.startsAtLocal).toISOString(),
      durationMinutes: Number(form.durationMinutes),
      youtubeUrlOrId: form.youtubeUrlOrId,
      // Create only accepts a set value or omission; update also accepts null
      // (to clear a previously-set batch/co-host) — createLiveClassSchema vs.
      // updateLiveClassSchema in packages/contracts/src/live-classes.ts.
      batchId: form.batchId || (form.id ? null : undefined),
      coHostUserId: form.coHostUserId || (form.id ? null : undefined),
    };
    if (!form.id && form.repeatEnabled && form.repeatUntilLocal) {
      body.repeat = { frequency: form.repeatFrequency, until: new Date(form.repeatUntilLocal).toISOString() };
    }
    try {
      if (form.id) {
        await apiFetch(`/admin/live-classes/${form.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await apiFetch('/admin/live-classes', { method: 'POST', body: JSON.stringify({ courseId, ...body }) });
      }
      setForm(null);
      setToast(L('सहेजा गया', 'Saved'));
      load();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelClass(id: string) {
    if (!confirm(L('क्या आप इस लाइव क्लास को रद्द करना चाहते हैं?', 'Cancel this live class?'))) return;
    await apiFetch(`/admin/live-classes/${id}/cancel`, { method: 'POST' });
    load();
  }

  async function viewAttendance(id: string) {
    const rows = await apiFetch<LiveClassAttendanceRow[]>(`/admin/live-classes/${id}/attendance`);
    setAttendanceFor({ id, rows });
  }

  async function publishAsLesson() {
    if (!publishFor || !publishTopicId) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/live-classes/${publishFor}/publish-as-lesson`, { method: 'POST', body: JSON.stringify({ topicId: publishTopicId }) });
      setPublishFor(null);
      setToast(L('पाठ के रूप में प्रकाशित किया गया', 'Published as lesson'));
      load();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  if (classes === null) return <p className="text-sm text-muted">{L('लोड हो रहा है…', 'Loading…')}</p>;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-black text-navy-900">{L('लाइव क्लासेस', 'Live Classes')}</h3>
        <Button onClick={openCreate} className="min-h-[40px] px-4 text-sm">{L('+ शेड्यूल करें', '+ Schedule')}</Button>
      </div>
      <p className="mb-4 max-w-xl text-xs text-muted">
        {L(
          'कोई भी YouTube Live लिंक पेस्ट करें — प्रसारण समाप्त होने के बाद उसी वीडियो को "पाठ के रूप में प्रकाशित करें" से दोबारा देखने के लिए उपलब्ध कराया जा सकता है।',
          'Paste any YouTube Live link — once the broadcast ends, the same video can be made available for rewatching via "Publish as lesson".',
        )}
      </p>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {classes.length === 0 ? (
        <p className="text-sm text-muted">{L('अभी कोई लाइव क्लास शेड्यूल नहीं है।', 'No live classes scheduled yet.')}</p>
      ) : (
        <div className="grid gap-2">
          {classes.map((c) => {
            const ended = c.phase === 'ENDED';
            return (
              <Card key={c.id} className={c.status === 'CANCELLED' ? 'opacity-60' : undefined}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink">{hi ? c.titleHi : c.titleEn}</span>
                      {c.phase === 'LIVE_NOW' && c.status === 'SCHEDULED' ? (
                        <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-extrabold text-white">{L('लाइव', 'LIVE')}</span>
                      ) : null}
                      {c.status === 'CANCELLED' ? (
                        <span className="rounded-full bg-line px-2 py-0.5 text-[10px] font-extrabold text-muted">{L('रद्द', 'CANCELLED')}</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(c.startsAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {c.durationMinutes} {L('मिनट', 'min')} · {c.attendeeCount} {L('उपस्थित', 'attended')}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                      <span>{L('होस्ट', 'Hosted by')} {c.hostName}{c.coHostName ? ` · ${L('सह-होस्ट', 'co-hosted by')} ${c.coHostName}` : ''}</span>
                      {c.batchNameHi ? (
                        <span className="rounded-full bg-surface-soft px-2 py-0.5 font-bold text-navy-700" title={L('केवल लेबल — एक्सेस प्रतिबंधित नहीं करता', 'Label only — does not restrict access')}>
                          {hi ? c.batchNameHi : c.batchNameEn}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button onClick={() => void viewAttendance(c.id)} className="rounded-md border border-line px-2.5 py-1 text-xs font-bold text-navy-900 hover:bg-surface-soft">{L('उपस्थिति', 'Attendance')}</button>
                    {c.status === 'SCHEDULED' ? (
                      <>
                        <button onClick={() => openEdit(c)} className="rounded-md border border-line px-2.5 py-1 text-xs font-bold text-navy-900 hover:bg-surface-soft">{L('संपादित करें', 'Edit')}</button>
                        {ended && !c.publishedLessonId ? (
                          <button onClick={() => { setPublishFor(c.id); setPublishTopicId(''); }} className="rounded-md border border-teal-500/40 bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-600 hover:bg-teal-100/70">{L('पाठ के रूप में प्रकाशित करें', 'Publish as lesson')}</button>
                        ) : null}
                        {c.publishedLessonId ? (
                          <span className="rounded-md bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-600">{L('पाठ के रूप में प्रकाशित', 'Published as lesson')}</span>
                        ) : null}
                        {!ended ? (
                          <button onClick={() => void cancelClass(c.id)} className="rounded-md border border-danger/30 px-2.5 py-1 text-xs font-bold text-danger hover:bg-orange-100/30">{L('रद्द करें', 'Cancel')}</button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" onClick={(e) => e.target === e.currentTarget && setForm(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-3 text-lg font-black text-navy-900">{form.id ? L('लाइव क्लास संपादित करें', 'Edit live class') : L('लाइव क्लास शेड्यूल करें', 'Schedule a live class')}</h3>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label={L('शीर्षक (हिंदी)', 'Title (Hindi)')} name="titleHi" value={form.titleHi} onChange={(e) => setForm({ ...form, titleHi: e.target.value })} />
                <Field label={L('शीर्षक (English)', 'Title (English)')} name="titleEn" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={L('विवरण (हिंदी, वैकल्पिक)', 'Description (Hindi, optional)')} name="descHi" value={form.descriptionHi} onChange={(e) => setForm({ ...form, descriptionHi: e.target.value })} />
                <Field label={L('विवरण (English, वैकल्पिक)', 'Description (English, optional)')} name="descEn" value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={L('प्रारंभ समय', 'Start time')} name="startsAt" type="datetime-local" value={form.startsAtLocal} onChange={(e) => setForm({ ...form, startsAtLocal: e.target.value })} />
                <Field label={L('अवधि (मिनट)', 'Duration (minutes)')} name="duration" type="number" min={5} max={360} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
              </div>
              <Field label={L('YouTube Live लिंक', 'YouTube Live URL')} name="youtubeUrl" value={form.youtubeUrlOrId} onChange={(e) => setForm({ ...form, youtubeUrlOrId: e.target.value })} placeholder="https://youtube.com/watch?v=... or youtu.be/..." />

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-navy-900">{L('बैच (वैकल्पिक लेबल)', 'Batch (optional label)')}</span>
                  <select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} className="w-full rounded-md border border-line px-3 py-3 text-sm outline-none focus:border-orange-500">
                    <option value="">{L('— कोई नहीं —', '— None —')}</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>{hi ? b.nameHi : b.nameEn}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-navy-900">{L('सह-होस्ट (वैकल्पिक)', 'Co-host (optional)')}</span>
                  <select value={form.coHostUserId} onChange={(e) => setForm({ ...form, coHostUserId: e.target.value })} className="w-full rounded-md border border-line px-3 py-3 text-sm outline-none focus:border-orange-500">
                    <option value="">{L('— कोई नहीं —', '— None —')}</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-[11px] text-muted">{L('बैच व सह-होस्ट केवल रिकॉर्ड के लिए हैं — किसी की पहुंच सीमित नहीं करते।', 'Batch and co-host are record-keeping only — neither restricts who can join.')}</p>

              {!form.id ? (
                <div className="rounded-md border border-line p-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-navy-900">
                    <input type="checkbox" checked={form.repeatEnabled} onChange={(e) => setForm({ ...form, repeatEnabled: e.target.checked })} />
                    {L('दोहराएं', 'Repeat')}
                  </label>
                  {form.repeatEnabled ? (
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-navy-900">{L('आवृत्ति', 'Frequency')}</span>
                        <select value={form.repeatFrequency} onChange={(e) => setForm({ ...form, repeatFrequency: e.target.value as 'DAILY' | 'WEEKLY' })} className="w-full rounded-md border border-line px-3 py-3 text-sm outline-none focus:border-orange-500">
                          <option value="DAILY">{L('रोज़ाना', 'Daily')}</option>
                          <option value="WEEKLY">{L('साप्ताहिक', 'Weekly')}</option>
                        </select>
                      </label>
                      <Field label={L('तक (तारीख)', 'Until (date)')} name="repeatUntil" type="date" value={form.repeatUntilLocal} onChange={(e) => setForm({ ...form, repeatUntilLocal: e.target.value })} />
                    </div>
                  ) : null}
                  <p className="mt-2 text-[11px] text-muted">{L('हर क्लास एक स्वतंत्र एंट्री बनती है — एक को रद्द करने से बाकी प्रभावित नहीं होतीं।', 'Each class is created as an independent entry — cancelling one never affects the others.')}</p>
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setForm(null)} className="min-h-[40px] px-4 text-sm">{L('रद्द करें', 'Cancel')}</Button>
              <Button onClick={() => void save()} loading={busy} className="min-h-[40px] px-4 text-sm">{L('सहेजें', 'Save')}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {attendanceFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" onClick={(e) => e.target === e.currentTarget && setAttendanceFor(null)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-3 text-lg font-black text-navy-900">{L('उपस्थिति', 'Attendance')}</h3>
            {attendanceFor.rows.length === 0 ? (
              <p className="text-sm text-muted">{L('अभी कोई उपस्थिति नहीं।', 'No attendance yet.')}</p>
            ) : (
              <div className="grid max-h-80 gap-1.5 overflow-y-auto">
                {attendanceFor.rows.map((r) => (
                  <div key={r.studentId} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-xs">
                    <span className="font-bold text-ink">{r.name}</span>
                    <span className="text-right text-muted">
                      <span className="block">{new Date(r.joinedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="block text-[10px]">{r.durationMinutes} {L('मिनट', 'min')}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setAttendanceFor(null)} className="min-h-[40px] px-4 text-sm">{L('बंद करें', 'Close')}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {publishFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" onClick={(e) => e.target === e.currentTarget && setPublishFor(null)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-3 text-lg font-black text-navy-900">{L('पाठ के रूप में प्रकाशित करें', 'Publish as lesson')}</h3>
            <p className="mb-3 text-xs text-muted">{L('चुनें कि यह रिकॉर्डिंग पाठ्यक्रम में कहाँ दिखाई दे।', 'Choose where this recording should appear in the curriculum.')}</p>
            {topics.length === 0 ? (
              <p className="text-sm text-muted">{L('पहले पाठ्यक्रम चरण में कम से कम एक विषय बनाएं।', 'Create at least one topic in the Curriculum step first.')}</p>
            ) : (
              <select value={publishTopicId} onChange={(e) => setPublishTopicId(e.target.value)} className="w-full rounded-md border border-line px-3 py-3 text-sm outline-none focus:border-orange-500">
                <option value="">{L('— विषय चुनें —', '— Select a topic —')}</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{hi ? t.nameHi : t.nameEn}</option>
                ))}
              </select>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPublishFor(null)} className="min-h-[40px] px-4 text-sm">{L('रद्द करें', 'Cancel')}</Button>
              <Button onClick={() => void publishAsLesson()} loading={busy} disabled={!publishTopicId} className="min-h-[40px] px-4 text-sm">{L('प्रकाशित करें', 'Publish')}</Button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
