'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { BlogPostSummary, BlogPostView } from '@rajyarank/contracts';

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const emptyForm = {
  slug: '',
  titleHi: '',
  titleEn: '',
  excerptHi: '',
  excerptEn: '',
  bodyHi: '',
  bodyEn: '',
  category: '',
  tagsInput: '',
  coverImageUrl: '',
  authorName: 'Team RajyaRank',
  seoTitleHi: '',
  seoTitleEn: '',
  seoDescriptionHi: '',
  seoDescriptionEn: '',
};

export function BlogManager({ initial, locale }: { initial: BlogPostSummary[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<BlogPostSummary[]>(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [previewHi, setPreviewHi] = useState(false);
  const [previewEn, setPreviewEn] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onTitleEnChange(v: string) {
    set('titleEn', v);
    if (!slugTouched) set('slug', slugify(v));
  }

  async function startEdit(row: BlogPostSummary) {
    setEditingId(row.id);
    setSlugTouched(true);
    setErrors({});
    setShowSeo(false);
    try {
      const full = await apiFetch<BlogPostView>(`/admin/blog/${row.id}`);
      populateForm(full);
    } catch (e) {
      setToast((e as ApiError).message);
      cancelEdit();
    }
  }

  function populateForm(row: BlogPostView) {
    setForm({
      slug: row.slug,
      titleHi: row.titleHi,
      titleEn: row.titleEn,
      excerptHi: row.excerptHi,
      excerptEn: row.excerptEn,
      bodyHi: row.bodyHi,
      bodyEn: row.bodyEn,
      category: row.category,
      tagsInput: row.tags.join(', '),
      coverImageUrl: row.coverImageUrl ?? '',
      authorName: row.authorName,
      seoTitleHi: row.seoTitleHi ?? '',
      seoTitleEn: row.seoTitleEn ?? '',
      seoDescriptionHi: row.seoDescriptionHi ?? '',
      seoDescriptionEn: row.seoDescriptionEn ?? '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setSlugTouched(false);
    setForm(emptyForm);
    setErrors({});
    setShowSeo(false);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.slug.trim()) errs.slug = L('स्लग दर्ज करें।', 'Enter a slug.');
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) errs.slug = L('केवल छोटे अक्षर, अंक और हाइफ़न।', 'Lowercase letters, numbers, and hyphens only.');
    if (!form.titleHi.trim()) errs.titleHi = L('हिन्दी शीर्षक दर्ज करें।', 'Enter the Hindi title.');
    if (!form.titleEn.trim()) errs.titleEn = L('English शीर्षक दर्ज करें।', 'Enter the English title.');
    if (!form.excerptHi.trim()) errs.excerptHi = L('हिन्दी सारांश दर्ज करें।', 'Enter the Hindi excerpt.');
    if (!form.excerptEn.trim()) errs.excerptEn = L('English सारांश दर्ज करें।', 'Enter the English excerpt.');
    if (!form.bodyHi.trim()) errs.bodyHi = L('हिन्दी सामग्री दर्ज करें।', 'Enter the Hindi body.');
    if (!form.bodyEn.trim()) errs.bodyEn = L('English सामग्री दर्ज करें।', 'Enter the English body.');
    if (!form.category.trim()) errs.category = L('श्रेणी दर्ज करें।', 'Enter a category.');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = {
        slug: form.slug.trim(),
        titleHi: form.titleHi.trim(),
        titleEn: form.titleEn.trim(),
        excerptHi: form.excerptHi.trim(),
        excerptEn: form.excerptEn.trim(),
        bodyHi: form.bodyHi,
        bodyEn: form.bodyEn,
        category: form.category.trim(),
        tags: form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        coverImageUrl: form.coverImageUrl.trim() || undefined,
        authorName: form.authorName.trim() || 'Team RajyaRank',
        seoTitleHi: form.seoTitleHi.trim() || undefined,
        seoTitleEn: form.seoTitleEn.trim() || undefined,
        seoDescriptionHi: form.seoDescriptionHi.trim() || undefined,
        seoDescriptionEn: form.seoDescriptionEn.trim() || undefined,
      };
      if (editingId) {
        const updated = await apiFetch<BlogPostView>(`/admin/blog/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setRows((r) => r.map((x) => (x.id === editingId ? updated : x)));
        setToast(L('लेख अपडेट किया गया।', 'Post updated.'));
      } else {
        const created = await apiFetch<BlogPostView>('/admin/blog', { method: 'POST', body: JSON.stringify(payload) });
        setRows((r) => [created, ...r]);
        setToast(L('ड्राफ्ट बनाया गया।', 'Draft created.'));
      }
      cancelEdit();
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(row: BlogPostSummary) {
    setRowBusy(row.id);
    try {
      const updated = await apiFetch<BlogPostView>(`/admin/blog/${row.id}/${row.published ? 'unpublish' : 'publish'}`, { method: 'POST' });
      setRows((r) => r.map((x) => (x.id === row.id ? updated : x)));
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setRowBusy(null);
    }
  }

  async function remove(id: string) {
    setRowBusy(id);
    try {
      await apiFetch(`/admin/blog/${id}`, { method: 'DELETE' });
      setRows((r) => r.filter((x) => x.id !== id));
      setConfirmingDelete(null);
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setRowBusy(null);
    }
  }

  const mini = 'rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50';

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('लेख', 'Posts')} ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="mb-4 text-sm text-muted">{L('अभी कोई लेख नहीं।', 'No posts yet.')}</p>
        ) : (
          <div className="mb-2 overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('शीर्षक', 'Title')}</th>
                  <th className="px-3 py-2">{L('श्रेणी', 'Category')}</th>
                  <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                  <th className="px-3 py-2">{L('तिथि', 'Date')}</th>
                  <th className="px-3 py-2 text-right">{L('कार्रवाई', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => {
                  const busyRow = rowBusy === p.id;
                  return (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-bold text-ink">
                        {hi ? p.titleHi : p.titleEn}
                        <div className="font-normal text-muted">/{p.slug}</div>
                      </td>
                      <td className="px-3 py-2 text-muted">{p.category}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${p.published ? 'bg-teal-100 text-success' : 'bg-line text-ink'}`}>
                          {p.published ? L('प्रकाशित', 'Published') : L('ड्राफ्ट', 'Draft')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted">{new Date(p.publishedAt ?? p.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button type="button" disabled={busyRow} className={mini} onClick={() => void startEdit(p)}>
                            {L('संपादित करें', 'Edit')}
                          </button>
                          <button type="button" disabled={busyRow} className={mini} onClick={() => void togglePublish(p)}>
                            {p.published ? L('अप्रकाशित करें', 'Unpublish') : L('प्रकाशित करें', 'Publish')}
                          </button>
                          {confirmingDelete === p.id ? (
                            <>
                              <button type="button" disabled={busyRow} className={`${mini} text-danger`} onClick={() => void remove(p.id)}>
                                {L('निश्चित?', 'Confirm?')}
                              </button>
                              <button type="button" className={mini} onClick={() => setConfirmingDelete(null)}>
                                {L('रद्द करें', 'Cancel')}
                              </button>
                            </>
                          ) : (
                            <button type="button" disabled={busyRow} className={`${mini} text-danger`} onClick={() => setConfirmingDelete(p.id)}>
                              {L('हटाएँ', 'Delete')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h3 className="mb-2 text-sm font-extrabold text-navy-900">
          {editingId ? L('लेख संपादित करें', 'Edit post') : L('नया लेख', 'New post')}
        </h3>
        {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
        <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }} className="grid gap-3 sm:grid-cols-2">
          <Field label={L('शीर्षक (हिन्दी)', 'Title (Hindi)')} name="titleHi" value={form.titleHi} error={errors.titleHi} onChange={(e) => set('titleHi', e.target.value)} />
          <Field label={L('शीर्षक (English)', 'Title (English)')} name="titleEn" value={form.titleEn} error={errors.titleEn} onChange={(e) => onTitleEnChange(e.target.value)} />
          <Field
            label={L('स्लग (URL)', 'Slug (URL)')}
            name="slug"
            value={form.slug}
            error={errors.slug}
            onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }}
            placeholder="how-to-crack-bpsc-prelims"
          />
          <Field label={L('श्रेणी', 'Category')} name="category" value={form.category} error={errors.category} onChange={(e) => set('category', e.target.value)} placeholder={L('जैसे: परीक्षा रणनीति', 'e.g. Exam Strategy')} />
          <Field label={L('टैग (कॉमा से अलग)', 'Tags (comma-separated)')} name="tags" value={form.tagsInput} onChange={(e) => set('tagsInput', e.target.value)} placeholder="bpsc, prelims, strategy" />
          <Field label={L('लेखक', 'Author')} name="authorName" value={form.authorName} onChange={(e) => set('authorName', e.target.value)} />
          <div className="sm:col-span-2">
            <Field label={L('कवर इमेज URL (वैकल्पिक)', 'Cover image URL (optional)')} name="coverImageUrl" value={form.coverImageUrl} onChange={(e) => set('coverImageUrl', e.target.value)} placeholder="https://…" />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-extrabold text-ink">{L('सारांश (हिन्दी)', 'Excerpt (Hindi)')}</label>
            <textarea value={form.excerptHi} onChange={(e) => set('excerptHi', e.target.value)} className="min-h-[60px] w-full rounded-md border border-line px-3 py-2 text-sm" />
            {errors.excerptHi ? <p className="mt-1 text-sm text-danger">{errors.excerptHi}</p> : null}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-extrabold text-ink">{L('सारांश (English)', 'Excerpt (English)')}</label>
            <textarea value={form.excerptEn} onChange={(e) => set('excerptEn', e.target.value)} className="min-h-[60px] w-full rounded-md border border-line px-3 py-2 text-sm" />
            {errors.excerptEn ? <p className="mt-1 text-sm text-danger">{errors.excerptEn}</p> : null}
          </div>

          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-extrabold text-ink">{L('सामग्री (हिन्दी, Markdown)', 'Body (Hindi, Markdown)')}</label>
              <button type="button" className="text-xs font-bold text-orange-600 hover:underline" onClick={() => setPreviewHi((v) => !v)}>
                {previewHi ? L('संपादित करें', 'Edit') : L('पूर्वावलोकन', 'Preview')}
              </button>
            </div>
            {previewHi ? (
              <div className="min-h-[160px] rounded-md border border-line bg-surface-soft p-3 text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.bodyHi || L('*कुछ नहीं*', '*Nothing yet*')}</ReactMarkdown>
              </div>
            ) : (
              <textarea value={form.bodyHi} onChange={(e) => set('bodyHi', e.target.value)} className="min-h-[160px] w-full rounded-md border border-line px-3 py-2 font-mono text-sm" />
            )}
            {errors.bodyHi ? <p className="mt-1 text-sm text-danger">{errors.bodyHi}</p> : null}
          </div>
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-extrabold text-ink">{L('सामग्री (English, Markdown)', 'Body (English, Markdown)')}</label>
              <button type="button" className="text-xs font-bold text-orange-600 hover:underline" onClick={() => setPreviewEn((v) => !v)}>
                {previewEn ? L('संपादित करें', 'Edit') : L('पूर्वावलोकन', 'Preview')}
              </button>
            </div>
            {previewEn ? (
              <div className="min-h-[160px] rounded-md border border-line bg-surface-soft p-3 text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.bodyEn || '*Nothing yet*'}</ReactMarkdown>
              </div>
            ) : (
              <textarea value={form.bodyEn} onChange={(e) => set('bodyEn', e.target.value)} className="min-h-[160px] w-full rounded-md border border-line px-3 py-2 font-mono text-sm" />
            )}
            {errors.bodyEn ? <p className="mt-1 text-sm text-danger">{errors.bodyEn}</p> : null}
          </div>

          <div className="sm:col-span-2">
            <button type="button" className="text-xs font-bold text-orange-600 hover:underline" onClick={() => setShowSeo((v) => !v)}>
              {showSeo ? L('SEO ओवरराइड छुपाएँ', 'Hide SEO overrides') : L('SEO ओवरराइड दिखाएँ (वैकल्पिक)', 'Show SEO overrides (optional)')}
            </button>
          </div>
          {showSeo ? (
            <>
              <Field label={L('SEO शीर्षक (हिन्दी)', 'SEO title (Hindi)')} name="seoTitleHi" value={form.seoTitleHi} onChange={(e) => set('seoTitleHi', e.target.value)} placeholder={L('डिफ़ॉल्ट: लेख शीर्षक', 'Default: post title')} />
              <Field label={L('SEO शीर्षक (English)', 'SEO title (English)')} name="seoTitleEn" value={form.seoTitleEn} onChange={(e) => set('seoTitleEn', e.target.value)} placeholder={L('डिफ़ॉल्ट: लेख शीर्षक', 'Default: post title')} />
              <div>
                <label className="mb-1 block text-xs font-bold text-muted">{L('SEO विवरण (हिन्दी)', 'SEO description (Hindi)')}</label>
                <textarea value={form.seoDescriptionHi} onChange={(e) => set('seoDescriptionHi', e.target.value)} className="min-h-[50px] w-full rounded-md border border-line px-3 py-2 text-sm" placeholder={L('डिफ़ॉल्ट: सारांश', 'Default: excerpt')} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted">{L('SEO विवरण (English)', 'SEO description (English)')}</label>
                <textarea value={form.seoDescriptionEn} onChange={(e) => set('seoDescriptionEn', e.target.value)} className="min-h-[50px] w-full rounded-md border border-line px-3 py-2 text-sm" placeholder={L('डिफ़ॉल्ट: सारांश', 'Default: excerpt')} />
              </div>
            </>
          ) : null}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" loading={busy} className="flex-1">
              {editingId ? L('सहेजें', 'Save') : L('ड्राफ्ट बनाएँ', 'Create draft')}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={cancelEdit} className="flex-1">
                {L('रद्द करें', 'Cancel')}
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
