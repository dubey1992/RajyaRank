'use client';
import { useState } from 'react';
import { Alert, Button, Field, Toast, ConfirmDialog } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { OrganizationView } from '@rajyarank/contracts';

export function OrganizationsManager({ initial, locale }: { initial: OrganizationView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<OrganizationView[]>(initial);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [headFullName, setHeadFullName] = useState('');
  const [headEmail, setHeadEmail] = useState('');
  const [headPhone, setHeadPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [del, setDel] = useState<OrganizationView | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  // Invite-head modal state.
  const [inviteFor, setInviteFor] = useState<OrganizationView | null>(null);
  const [iName, setIName] = useState('');
  const [iEmail, setIEmail] = useState('');
  const [iPhone, setIPhone] = useState('');
  const [iErrors, setIErrors] = useState<Record<string, string>>({});

  async function register() {
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = L('संस्थान का नाम दर्ज करें।', 'Enter the institution name.');
    if (!/^[A-Z0-9_]{2,40}$/.test(code)) errs.code = L('कोड बड़े अक्षर/अंक/अंडरस्कोर।', 'Code: uppercase letters, digits, underscores.');
    if (headFullName.trim().length < 2) errs.headFullName = L('प्रमुख का नाम दर्ज करें।', 'Enter the head’s name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(headEmail)) errs.headEmail = L('मान्य ईमेल दर्ज करें।', 'Enter a valid email.');
    if (!/^[6-9]\d{9}$/.test(headPhone)) errs.headPhone = L('मान्य 10-अंकीय मोबाइल नंबर दर्ज करें।', 'Enter a valid 10-digit mobile number.');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await apiFetch('/admin/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), code, headFullName: headFullName.trim(), headEmail: headEmail.trim(), headPhone }),
      });
      setRows((r) => [{ id: code, name: name.trim(), code, accessCode: null, status: 'ACTIVE', headName: headFullName.trim(), headEmail: headEmail.trim(), headPhone, heads: [], memberCount: 0, createdAt: new Date().toISOString() }, ...r]);
      setName(''); setCode(''); setHeadFullName(''); setHeadEmail(''); setHeadPhone(''); setErrors({});
      setToast(L('संस्थान पंजीकृत; प्रमुख को आमंत्रण भेजा गया।', 'Institution registered; invite sent to the head.'));
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(o: OrganizationView) {
    const next = o.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setRowBusy(o.id);
    try {
      await apiFetch(`/admin/organizations/${o.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      setRows((r) => r.map((x) => (x.id === o.id ? { ...x, status: next } : x)));
      setToast(next === 'ACTIVE' ? L('संस्थान सक्रिय किया गया।', 'Institution activated.') : L('संस्थान निष्क्रिय किया गया।', 'Institution deactivated.'));
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setRowBusy(null);
    }
  }

  async function removeOrg() {
    if (!del) return;
    setRowBusy(del.id);
    try {
      await apiFetch(`/admin/organizations/${del.id}`, { method: 'DELETE' });
      setRows((r) => r.filter((x) => x.id !== del.id));
      setToast(L('संस्थान हटाया गया।', 'Institution deleted.'));
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setRowBusy(null);
      setDel(null);
    }
  }

  async function rotateAccessCode(o: OrganizationView) {
    setRowBusy(o.id);
    try {
      const res = await apiFetch<{ id: string; accessCode: string }>(`/admin/organizations/${o.id}/access-code`, { method: 'POST' });
      setRows((r) => r.map((x) => (x.id === o.id ? { ...x, accessCode: res.accessCode } : x)));
      setToast(L('संस्थान कोड जारी किया गया।', 'Institute access code issued.'));
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setRowBusy(null);
    }
  }

  async function submitInviteHead() {
    if (!inviteFor) return;
    const errs: Record<string, string> = {};
    if (iName.trim().length < 2) errs.fullName = L('नाम दर्ज करें।', 'Enter a name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(iEmail)) errs.email = L('मान्य ईमेल दर्ज करें।', 'Enter a valid email.');
    if (!/^[6-9]\d{9}$/.test(iPhone)) errs.phone = L('मान्य 10-अंकीय मोबाइल नंबर दर्ज करें।', 'Enter a valid 10-digit mobile number.');
    setIErrors(errs);
    if (Object.keys(errs).length) return;
    setRowBusy(inviteFor.id);
    try {
      await apiFetch(`/admin/organizations/${inviteFor.id}/heads`, {
        method: 'POST',
        body: JSON.stringify({ fullName: iName.trim(), email: iEmail.trim(), phone: iPhone }),
      });
      setToast(L('प्रमुख को आमंत्रण भेजा गया।', 'Invitation sent to the head.'));
      setInviteFor(null); setIName(''); setIEmail(''); setIPhone(''); setIErrors({});
    } catch (e) {
      setIErrors(serverFieldErrors(e as ApiError));
    } finally {
      setRowBusy(null);
    }
  }

  const mini = 'rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section>
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('संस्थान', 'Institutions')} ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई संस्थान नहीं। दाईं ओर से पंजीकृत करें।', 'No institutions yet. Register one on the right.')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('संस्थान', 'Institution')}</th>
                  <th className="px-3 py-2">{L('प्रमुख', 'Heads')}</th>
                  <th className="px-3 py-2">{L('सदस्य', 'Members')}</th>
                  <th className="px-3 py-2">{L('संस्थान कोड', 'Access code')}</th>
                  <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                  <th className="px-3 py-2 text-right">{L('कार्रवाई', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-2"><div className="font-bold text-ink">{o.name}</div><div className="text-xs text-muted">{o.code}</div></td>
                    <td className="px-3 py-2 text-xs">
                      {o.heads && o.heads.length ? (
                        <div className="grid gap-1">
                          {o.heads.map((h) => (
                            <div key={h.id}>
                              <div>
                                <span className="font-bold text-ink">{h.name ?? h.email}</span>
                                {h.status !== 'ACTIVE' ? <span className="ml-1 text-muted">({h.status})</span> : null}
                              </div>
                              {h.name && h.email ? <div className="text-muted">{h.email}</div> : null}
                              {h.phone ? <div className="text-muted">{h.phone}</div> : null}
                            </div>
                          ))}
                        </div>
                      ) : o.headName ? (
                        <>
                          <div className="font-bold text-ink">{o.headName}</div>
                          <div className="text-muted">{o.headEmail}</div>
                          {o.headPhone ? <div className="text-muted">{o.headPhone}</div> : null}
                        </>
                      ) : (
                        <span className="text-muted">{L('आमंत्रण लंबित', 'Invite pending')}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{o.memberCount}</td>
                    <td className="px-3 py-2">
                      {o.accessCode ? (
                        <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs font-bold tracking-wide">{o.accessCode}</code>
                      ) : (
                        <span className="text-xs text-muted">{L('जारी नहीं', 'Not issued')}</span>
                      )}
                      <button type="button" disabled={rowBusy === o.id} className="ml-1.5 text-xs font-bold text-navy-700 hover:underline" onClick={() => void rotateAccessCode(o)}>
                        {o.accessCode ? L('पुनः जारी करें', 'Rotate') : L('जारी करें', 'Issue')}
                      </button>
                    </td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${o.status === 'ACTIVE' ? 'bg-teal-100 text-success' : 'bg-orange-100 text-danger'}`}>{o.status === 'ACTIVE' ? L('सक्रिय', 'Active') : L('निष्क्रिय', 'Inactive')}</span></td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button type="button" disabled={rowBusy === o.id} className={mini} onClick={() => { setInviteFor(o); setIName(''); setIEmail(''); setIPhone(''); setIErrors({}); }}>
                          {L('प्रमुख आमंत्रित करें', 'Invite Head')}
                        </button>
                        <button type="button" disabled={rowBusy === o.id} className={mini} onClick={() => void toggleStatus(o)}>
                          {o.status === 'ACTIVE' ? L('निष्क्रिय करें', 'Deactivate') : L('सक्रिय करें', 'Activate')}
                        </button>
                        <button type="button" disabled={rowBusy === o.id} className={`${mini} text-danger`} onClick={() => setDel(o)}>
                          {L('हटाएँ', 'Delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-1 text-lg font-extrabold text-navy-900">{L('संस्थान पंजीकृत करें', 'Register institution')}</h2>
        <p className="mb-3 text-xs text-muted">{L('प्रमुख को खाता सेट करने हेतु आमंत्रण ईमेल भेजा जाएगा। बाद में और प्रमुख जोड़ सकते हैं।', 'The head receives an email invite. You can add more heads later.')}</p>
        {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
        <form noValidate onSubmit={(e) => { e.preventDefault(); void register(); }}>
          <Field label={L('संस्थान का नाम', 'Institution name')} name="name" value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
          <Field label={L('कोड', 'Code')} name="code" value={code} error={errors.code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <Field label={L('प्रमुख का नाम', 'Head full name')} name="headFullName" value={headFullName} error={errors.headFullName} onChange={(e) => setHeadFullName(e.target.value)} />
          <Field label={L('प्रमुख का ईमेल', 'Head email')} name="headEmail" type="email" value={headEmail} error={errors.headEmail} onChange={(e) => setHeadEmail(e.target.value)} />
          <Field
            label={L('प्रमुख का मोबाइल नंबर', "Head's mobile number")}
            name="headPhone"
            inputMode="numeric"
            maxLength={10}
            value={headPhone}
            error={errors.headPhone}
            onChange={(e) => setHeadPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
          <Button type="submit" loading={busy} className="w-full">{L('पंजीकृत करें व प्रमुख को आमंत्रित करें', 'Register & invite head')}</Button>
        </form>
      </section>

      {/* Invite-head modal */}
      {inviteFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" onClick={() => setInviteFor(null)}>
          <div className="w-full max-w-md rounded-lg border border-line bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-black text-navy-900">{L('प्रमुख आमंत्रित करें', 'Invite Head')}</h3>
            <p className="mb-3 text-xs text-muted">{inviteFor.name} · {inviteFor.code}</p>
            {iErrors._form ? <div className="mb-3"><Alert tone="error">{iErrors._form}</Alert></div> : null}
            <form noValidate onSubmit={(e) => { e.preventDefault(); void submitInviteHead(); }}>
              <Field label={L('नाम', 'Full name')} name="fullName" value={iName} error={iErrors.fullName} onChange={(e) => setIName(e.target.value)} />
              <Field label={L('ईमेल', 'Email')} name="email" type="email" value={iEmail} error={iErrors.email} onChange={(e) => setIEmail(e.target.value)} />
              <Field
                label={L('मोबाइल नंबर', 'Mobile number')}
                name="phone"
                inputMode="numeric"
                maxLength={10}
                value={iPhone}
                error={iErrors.phone}
                onChange={(e) => setIPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" className="rounded-md border border-line px-3 py-2 text-sm font-bold" onClick={() => setInviteFor(null)}>{L('रद्द करें', 'Cancel')}</button>
                <Button type="submit" loading={rowBusy === inviteFor.id}>{L('आमंत्रण भेजें', 'Send invite')}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!del}
        title={L('संस्थान हटाएँ?', 'Delete institution?')}
        message={del ? L(`"${del.name}" हटाया जाएगा; सदस्य व कोर्स अलग कर दिए जाएँगे।`, `"${del.name}" will be removed; members and courses are detached.`) : ''}
        confirmLabel={L('हटाएँ', 'Delete')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        tone="danger"
        busy={rowBusy === del?.id}
        onConfirm={() => void removeOrg()}
        onCancel={() => setDel(null)}
      />
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
