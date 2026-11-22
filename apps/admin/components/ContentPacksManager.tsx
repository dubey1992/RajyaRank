'use client';
import { useState } from 'react';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { ContentPackAdminView, ContentPackItemSearchResult } from '@rajyarank/contracts';

type PackItem = { kind: 'LESSON' | 'TEST'; id: string; titleHi: string; titleEn: string };

const emptyForm = {
  titleHi: '',
  titleEn: '',
  priceRupees: '',
  originalPriceRupees: '',
  audience: 'PUBLIC' as 'PUBLIC' | 'INSTITUTE',
  active: true,
  items: [] as PackItem[],
};

function ItemPicker({ kind, locale, onAdd }: { kind: 'LESSON' | 'TEST'; locale: 'hi' | 'en'; onAdd: (item: PackItem) => void }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ContentPackItemSearchResult[]>([]);
  const [busy, setBusy] = useState(false);

  async function search(value: string) {
    setQ(value);
    if (value.trim().length < 2) { setResults([]); return; }
    setBusy(true);
    try {
      const path = kind === 'LESSON' ? '/admin/content-packs/search-lessons' : '/admin/content-packs/search-tests';
      const rows = await apiFetch<ContentPackItemSearchResult[]>(`${path}?q=${encodeURIComponent(value.trim())}`);
      setResults(rows);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input
        value={q}
        onChange={(e) => void search(e.target.value)}
        placeholder={kind === 'LESSON' ? L('पाठ शीर्षक खोजें…', 'Search lesson titles…') : L('टेस्ट शीर्षक खोजें…', 'Search test titles…')}
        className="w-full rounded-md border border-line px-3 py-2 text-sm"
      />
      {busy ? <p className="mt-1 text-xs text-muted">{L('खोज रहे हैं…', 'Searching…')}</p> : null}
      {results.length ? (
        <ul className="mt-1.5 grid max-h-40 gap-1 overflow-y-auto rounded-md border border-line p-1.5">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd({ kind, id: r.id, titleHi: r.titleHi, titleEn: r.titleEn });
                  setQ('');
                  setResults([]);
                }}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-soft"
              >
                <span className="truncate">{hi ? r.titleHi : r.titleEn}{r.courseTitleEn ? <span className="ml-1.5 text-xs text-muted">· {hi ? r.courseTitleHi : r.courseTitleEn}</span> : null}</span>
                <span className="shrink-0 text-xs font-bold text-orange-600">{L('जोड़ें', 'Add')}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ContentPacksManager({ initial, locale }: { initial: ContentPackAdminView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<ContentPackAdminView[]>(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setShowForm(true);
  }

  function startEdit(row: ContentPackAdminView) {
    setEditingId(row.id);
    setForm({
      titleHi: row.titleHi,
      titleEn: row.titleEn,
      priceRupees: String(row.priceMinor / 100),
      originalPriceRupees: row.originalPriceMinor ? String(row.originalPriceMinor / 100) : '',
      audience: row.audience,
      active: row.active,
      items: row.items,
    });
    setErrors({});
    setShowForm(true);
  }

  function addItem(item: PackItem) {
    setForm((f) => (f.items.some((i) => i.kind === item.kind && i.id === item.id) ? f : { ...f, items: [...f.items, item] }));
  }

  function removeItem(item: PackItem) {
    setForm((f) => ({ ...f, items: f.items.filter((i) => !(i.kind === item.kind && i.id === item.id)) }));
  }

  async function save() {
    const errs: Record<string, string> = {};
    if (!form.titleHi.trim()) errs.titleHi = L('हिन्दी शीर्षक दर्ज करें।', 'Enter the Hindi title.');
    if (!form.titleEn.trim()) errs.titleEn = L('English शीर्षक दर्ज करें।', 'Enter the English title.');
    if (!form.priceRupees || Number(form.priceRupees) <= 0) errs.priceRupees = L('मूल्य दर्ज करें।', 'Enter a price.');
    if (form.items.length < 2) errs._form = L('पैक में कम से कम 2 आइटम होने चाहिए।', 'A pack needs at least 2 items — a single item should just get its own individual price instead.');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const body = JSON.stringify({
        titleHi: form.titleHi.trim(),
        titleEn: form.titleEn.trim(),
        priceMinor: Math.round(Number(form.priceRupees) * 100),
        ...(form.originalPriceRupees ? { originalPriceMinor: Math.round(Number(form.originalPriceRupees) * 100) } : {}),
        audience: form.audience,
        active: form.active,
        items: form.items.map((i) => ({ kind: i.kind, id: i.id })),
      });
      const saved = editingId
        ? await apiFetch<ContentPackAdminView>(`/admin/content-packs/${editingId}`, { method: 'PUT', body })
        : await apiFetch<ContentPackAdminView>('/admin/content-packs', { method: 'POST', body });
      setRows((r) => (editingId ? r.map((x) => (x.id === editingId ? saved : x)) : [saved, ...r]));
      setToast(editingId ? L('सहेजा गया।', 'Saved.') : L('पैक बनाया गया।', 'Pack created.'));
      setShowForm(false);
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-navy-900">{L('कंटेंट पैक', 'Content Packs')} ({rows.length})</h2>
        {showForm ? null : <Button onClick={startCreate}>{L('+ नया पैक', '+ New pack')}</Button>}
      </div>
      <p className="mb-3 text-xs text-muted">
        {L(
          'कई पाठ और टेस्ट एक साथ एक कीमत पर बेचें — जैसे ही कोई खरीदता है, पैक के हर आइटम तक पहुंच मिल जाती है।',
          'Sell several lessons and tests together at one price — buying the pack unlocks every item in it immediately.',
        )}
      </p>

      {!showForm && rows.length === 0 ? <p className="mb-2 text-sm text-muted">{L('अभी कोई पैक नहीं।', 'No packs yet.')}</p> : null}

      {!showForm ? (
        <ul className="grid gap-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 rounded-md border border-line p-3">
              <div className="min-w-0">
                <div className="font-bold text-ink">
                  {hi ? r.titleHi : r.titleEn}
                  <span className="ml-2 text-xs font-extrabold text-orange-600">₹{(r.priceMinor / 100).toLocaleString('en-IN')}</span>
                  {!r.active ? <span className="ml-2 rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-bold text-muted">{L('निष्क्रिय', 'Inactive')}</span> : null}
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {r.items.length} {L('आइटम', 'items')} · {r.audience === 'PUBLIC' ? L('सार्वजनिक', 'Public') : L('संस्थान', 'Institute')} ·{' '}
                  {r.items.map((i) => (hi ? i.titleHi : i.titleEn)).join(', ')}
                </div>
              </div>
              <button type="button" className="shrink-0 rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft" onClick={() => startEdit(r)}>
                {L('संपादित करें', 'Edit')}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-md border border-line p-4">
          <h3 className="mb-3 text-sm font-extrabold text-navy-900">{editingId ? L('पैक संपादित करें', 'Edit pack') : L('नया पैक', 'New pack')}</h3>
          {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
          <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={L('शीर्षक (हिन्दी)', 'Title (Hindi)')} name="titleHi" value={form.titleHi} error={errors.titleHi} onChange={(e) => setForm((f) => ({ ...f, titleHi: e.target.value }))} />
              <Field label={L('शीर्षक (English)', 'Title (English)')} name="titleEn" value={form.titleEn} error={errors.titleEn} onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={L('विक्रय मूल्य (₹)', 'Selling price (₹)')} name="priceRupees" inputMode="numeric" value={form.priceRupees} error={errors.priceRupees} onChange={(e) => setForm((f) => ({ ...f, priceRupees: e.target.value.replace(/\D/g, '') }))} />
              <Field label={L('मूल मूल्य (₹, वैकल्पिक)', 'Original price (₹, optional)')} name="originalPriceRupees" inputMode="numeric" value={form.originalPriceRupees} onChange={(e) => setForm((f) => ({ ...f, originalPriceRupees: e.target.value.replace(/\D/g, '') }))} />
              <div>
                <label className="mb-1 block text-sm font-extrabold text-ink">{L('ऑडियंस', 'Audience')}</label>
                <select value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as 'PUBLIC' | 'INSTITUTE' }))} className="w-full rounded-md border border-line px-3 py-3 text-sm">
                  <option value="PUBLIC">{L('सार्वजनिक', 'Public')}</option>
                  <option value="INSTITUTE">{L('संस्थान', 'Institute')}</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="h-4 w-4 accent-orange-500" />
              {L('सक्रिय (छात्रों को दिखे)', 'Active (visible to students)')}
            </label>

            <div>
              <h4 className="mb-1.5 text-sm font-extrabold text-navy-900">{L('आइटम जोड़ें', 'Add items')}</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <ItemPicker kind="LESSON" locale={locale} onAdd={addItem} />
                <ItemPicker kind="TEST" locale={locale} onAdd={addItem} />
              </div>
            </div>

            <div>
              <h4 className="mb-1.5 text-sm font-extrabold text-navy-900">{L('चयनित आइटम', 'Selected items')} ({form.items.length})</h4>
              {form.items.length === 0 ? (
                <p className="text-sm text-muted">{L('अभी कोई आइटम नहीं जोड़ा गया।', 'No items added yet.')}</p>
              ) : (
                <ul className="grid gap-1.5">
                  {form.items.map((i) => (
                    <li key={`${i.kind}-${i.id}`} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-1.5 text-sm">
                      <span className="truncate"><span className="mr-1.5 rounded-full bg-surface-soft px-1.5 py-0.5 text-[10px] font-bold text-muted">{i.kind}</span>{hi ? i.titleHi : i.titleEn}</span>
                      <button type="button" className="shrink-0 text-xs font-bold text-danger" onClick={() => removeItem(i)}>{L('हटाएँ', 'Remove')}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" loading={busy}>{editingId ? L('सहेजें', 'Save') : L('पैक बनाएं', 'Create pack')}</Button>
              <button type="button" className="rounded-md border border-line px-4 py-2 text-sm font-bold hover:bg-surface-soft" onClick={() => setShowForm(false)}>{L('रद्द करें', 'Cancel')}</button>
            </div>
          </form>
        </div>
      )}
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </section>
  );
}
