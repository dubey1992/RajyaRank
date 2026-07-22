'use client';
import { useState } from 'react';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { SubscriptionPlanView } from '@rajyarank/contracts';

function rupees(minor: number) {
  return `₹${(minor / 100).toLocaleString('en-IN')}`;
}

export function SubscriptionPlansManager({ initial, locale }: { initial: SubscriptionPlanView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<SubscriptionPlanView[]>(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [priceMonthly, setPriceMonthly] = useState('');
  const [maxStudents, setMaxStudents] = useState('');
  const [maxStaff, setMaxStaff] = useState('');
  const [storageGb, setStorageGb] = useState('');
  const [internalFeePct, setInternalFeePct] = useState('');
  const [externalFeePct, setExternalFeePct] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function togglePlanActive(row: SubscriptionPlanView) {
    setRowBusy(row.id);
    try {
      await apiFetch(`/admin/billing/plans/${row.id}`, { method: 'PATCH', body: JSON.stringify({ active: !row.active }) });
      setRows((r) => r.map((x) => (x.id === row.id ? { ...x, active: !x.active } : x)));
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setRowBusy(null);
    }
  }

  async function create() {
    const errs: Record<string, string> = {};
    if (!/^[A-Z0-9_]{2,40}$/.test(code)) errs.code = L('कोड बड़े अक्षर/अंक/अंडरस्कोर।', 'Code: uppercase letters, digits, underscores.');
    if (!nameHi.trim()) errs.nameHi = L('हिन्दी नाम दर्ज करें।', 'Enter the Hindi name.');
    if (!nameEn.trim()) errs.nameEn = L('English नाम दर्ज करें।', 'Enter the English name.');
    if (!priceMonthly || Number(priceMonthly) <= 0) errs.priceMonthly = L('मासिक मूल्य दर्ज करें।', 'Enter a monthly price.');
    if (!maxStudents) errs.maxStudents = L('अधिकतम छात्र दर्ज करें।', 'Enter max students.');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const priceMonthlyMinor = Math.round(Number(priceMonthly) * 100);
      const created = await apiFetch<SubscriptionPlanView>('/admin/billing/plans', {
        method: 'POST',
        body: JSON.stringify({
          code,
          nameHi: nameHi.trim(),
          nameEn: nameEn.trim(),
          priceMonthlyMinor,
          priceAnnualMinor: priceMonthlyMinor * 10,
          maxActiveStudents: Number(maxStudents),
          maxStaffSeats: Number(maxStaff) || 1,
          storageGb: Number(storageGb) || 10,
          internalFeeBps: Math.round((Number(internalFeePct) || 0) * 100),
          externalFeeBps: Math.round((Number(externalFeePct) || 0) * 100),
          sequence: rows.length,
        }),
      });
      setRows((r) => [...r, created]);
      setCode(''); setNameHi(''); setNameEn(''); setPriceMonthly(''); setMaxStudents(''); setMaxStaff(''); setStorageGb(''); setInternalFeePct(''); setExternalFeePct(''); setErrors({});
      setToast(L('योजना बनाई गई।', 'Plan created.'));
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  const mini = 'rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50';

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('संस्थान योजनाएँ', 'Institution Plans')} ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="mb-4 text-sm text-muted">{L('अभी कोई योजना नहीं।', 'No plans yet.')}</p>
      ) : (
        <div className="mb-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">{L('योजना', 'Plan')}</th>
                <th className="px-3 py-2">{L('मासिक', 'Monthly')}</th>
                <th className="px-3 py-2">{L('छात्र सीमा', 'Student cap')}</th>
                <th className="px-3 py-2">{L('आंतरिक शुल्क', 'Internal fee')}</th>
                <th className="px-3 py-2">{L('बाहरी शुल्क', 'External fee')}</th>
                <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                <th className="px-3 py-2 text-right">{L('कार्रवाई', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2"><div className="font-bold text-ink">{hi ? p.nameHi : p.nameEn}</div><div className="text-xs text-muted">{p.code}</div></td>
                  <td className="px-3 py-2">{rupees(p.priceMonthlyMinor)}</td>
                  <td className="px-3 py-2">{p.maxActiveStudents.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2">{(p.internalFeeBps / 100).toFixed(1)}%</td>
                  <td className="px-3 py-2">{(p.externalFeeBps / 100).toFixed(1)}%</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${p.active ? 'bg-teal-100 text-success' : 'bg-orange-100 text-danger'}`}>{p.active ? L('सक्रिय', 'Active') : L('निष्क्रिय', 'Inactive')}</span></td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" disabled={rowBusy === p.id} className={mini} onClick={() => void togglePlanActive(p)}>
                      {p.active ? L('निष्क्रिय करें', 'Deactivate') : L('सक्रिय करें', 'Activate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mb-2 text-sm font-extrabold text-navy-900">{L('नई योजना', 'New plan')}</h3>
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void create(); }} className="grid gap-3 sm:grid-cols-3">
        <Field label={L('कोड', 'Code')} name="code" value={code} error={errors.code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <Field label={L('नाम (हिन्दी)', 'Name (Hindi)')} name="nameHi" value={nameHi} error={errors.nameHi} onChange={(e) => setNameHi(e.target.value)} />
        <Field label={L('नाम (English)', 'Name (English)')} name="nameEn" value={nameEn} error={errors.nameEn} onChange={(e) => setNameEn(e.target.value)} />
        <Field label={L('मासिक मूल्य (₹)', 'Monthly price (₹)')} name="priceMonthly" inputMode="numeric" value={priceMonthly} error={errors.priceMonthly} onChange={(e) => setPriceMonthly(e.target.value.replace(/[^\d.]/g, ''))} />
        <Field label={L('अधिकतम सक्रिय छात्र', 'Max active students')} name="maxStudents" inputMode="numeric" value={maxStudents} error={errors.maxStudents} onChange={(e) => setMaxStudents(e.target.value.replace(/\D/g, ''))} />
        <Field label={L('स्टाफ सीटें', 'Staff seats')} name="maxStaff" inputMode="numeric" value={maxStaff} onChange={(e) => setMaxStaff(e.target.value.replace(/\D/g, ''))} />
        <Field label={L('स्टोरेज (GB)', 'Storage (GB)')} name="storageGb" inputMode="numeric" value={storageGb} onChange={(e) => setStorageGb(e.target.value.replace(/\D/g, ''))} />
        <Field label={L('आंतरिक शुल्क %', 'Internal fee %')} name="internalFeePct" inputMode="numeric" value={internalFeePct} onChange={(e) => setInternalFeePct(e.target.value.replace(/[^\d.]/g, ''))} />
        <Field label={L('बाहरी शुल्क %', 'External fee %')} name="externalFeePct" inputMode="numeric" value={externalFeePct} onChange={(e) => setExternalFeePct(e.target.value.replace(/[^\d.]/g, ''))} />
        <div className="sm:col-span-3">
          <Button type="submit" loading={busy} className="w-full">{L('योजना बनाएँ', 'Create plan')}</Button>
        </div>
      </form>
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </section>
  );
}
