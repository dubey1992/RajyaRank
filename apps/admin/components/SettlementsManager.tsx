'use client';
import { Fragment, useState } from 'react';
import { Alert, Toast } from '@rajyarank/ui';
import { apiFetch, apiDownloadPresigned, type ApiError } from '@/lib/api';
import type { SettlementSummaryView, LinkedAccountView, TransferView, KycSubmissionView } from '@rajyarank/contracts';

function rupees(minor: number) {
  return `₹${(minor / 100).toLocaleString('en-IN')}`;
}

const KYC_TONE: Record<string, string> = {
  VERIFIED: 'bg-teal-100 text-success',
  PENDING: 'bg-orange-100 text-orange-700',
  REJECTED: 'bg-orange-100 text-danger',
};

export function SettlementsManager({
  summary,
  initialLinkedAccounts,
  initialTransfers,
  locale,
}: {
  summary: SettlementSummaryView;
  initialLinkedAccounts: LinkedAccountView[];
  initialTransfers: TransferView[];
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [accounts, setAccounts] = useState(initialLinkedAccounts);
  const [transfers] = useState(initialTransfers);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [kycByOrg, setKycByOrg] = useState<Record<string, KycSubmissionView | null>>({});
  const [kycLoading, setKycLoading] = useState<string | null>(null);
  const [rejectingOrgId, setRejectingOrgId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function toggleKyc(orgId: string) {
    if (expandedOrgId === orgId) {
      setExpandedOrgId(null);
      return;
    }
    setExpandedOrgId(orgId);
    if (kycByOrg[orgId] === undefined) {
      setKycLoading(orgId);
      try {
        const submission = await apiFetch<KycSubmissionView | null>(`/admin/settlements/linked-accounts/${orgId}/kyc-submission`);
        setKycByOrg((m) => ({ ...m, [orgId]: submission }));
      } catch (e) {
        setError((e as ApiError).message);
      } finally {
        setKycLoading(null);
      }
    }
  }

  async function downloadDoc(documentId: string, filename: string) {
    try {
      await apiDownloadPresigned(`/admin/settlements/kyc-documents/${documentId}`, filename);
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  async function verifyKyc(orgId: string) {
    setRowBusy(orgId);
    setError(null);
    try {
      const updated = await apiFetch<LinkedAccountView>(`/admin/settlements/linked-accounts/${orgId}/kyc`, { method: 'POST' });
      setAccounts((rows) => rows.map((a) => (a.orgId === orgId ? updated : a)));
      setToast(L('KYC सत्यापित; भुगतान सक्षम।', 'KYC verified; payouts enabled.'));
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setRowBusy(null);
    }
  }

  function startReject(orgId: string) {
    setRejectingOrgId(orgId);
    setRejectReason('');
    setError(null);
  }

  async function submitReject(orgId: string) {
    if (rejectReason.trim().length < 5) {
      setError(L('कारण कम से कम 5 अक्षर का होना चाहिए।', 'Reason must be at least 5 characters.'));
      return;
    }
    setRowBusy(orgId);
    setError(null);
    try {
      const updated = await apiFetch<LinkedAccountView>(`/admin/settlements/linked-accounts/${orgId}/kyc/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      setAccounts((rows) => rows.map((a) => (a.orgId === orgId ? updated : a)));
      setKycByOrg((m) => (m[orgId] ? { ...m, [orgId]: { ...m[orgId]!, kycStatus: 'REJECTED', kycRejectionReason: rejectReason.trim() } } : m));
      setRejectingOrgId(null);
      setToast(L('KYC अस्वीकृत; संस्थान को कारण दिख जाएगा।', 'KYC rejected; the institution will see the reason.'));
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('कुल मार्केटप्लेस बिक्री', 'Gross marketplace sales')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{rupees(summary.grossMinor)}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('संस्थान देय', 'Institution payable')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{rupees(summary.institutionPayableMinor)}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('मंच राजस्व', 'Platform revenue')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{rupees(summary.platformRevenueMinor)}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('रिज़र्व होल्ड', 'Reserve held')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{rupees(summary.reserveHeldMinor)}</div>
        </div>
      </div>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('संस्थान लिंक्ड खाते व KYC', 'Institute linked accounts & KYC')} ({accounts.length})</h2>
        {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
        {accounts.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई संस्थान भुगतान हेतु ऑनबोर्ड नहीं है।', 'No institution is onboarded for payouts yet.')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('संस्थान', 'Institution')}</th>
                  <th className="px-3 py-2">{L('रिज़र्व होल्ड', 'Reserve held')}</th>
                  <th className="px-3 py-2">{L('KYC', 'KYC')}</th>
                  <th className="px-3 py-2">{L('भुगतान सक्षम', 'Payouts')}</th>
                  <th className="px-3 py-2 text-right">{L('कार्रवाई', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {accounts.map((a) => {
                  const submission = kycByOrg[a.orgId];
                  return (
                    <Fragment key={a.id}>
                      <tr>
                        <td className="px-3 py-2 font-bold text-ink">{a.orgName}</td>
                        <td className="px-3 py-2">{rupees(a.reserveHeldMinor)}</td>
                        <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${KYC_TONE[a.kycStatus] ?? 'bg-line text-muted'}`}>{a.kycStatus}</span></td>
                        <td className="px-3 py-2">{a.payoutsEnabled ? L('हाँ', 'Yes') : L('नहीं', 'No')}</td>
                        <td className="px-3 py-2">
                          {rejectingOrgId === a.orgId ? (
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder={L('अस्वीकृति का कारण…', 'Reason for rejection…')}
                                rows={2}
                                className="w-56 rounded-md border border-line px-2 py-1 text-xs outline-none focus:border-orange-500"
                              />
                              <button type="button" disabled={rowBusy === a.orgId} className="rounded-md bg-danger px-2 py-1 text-xs font-bold text-white hover:bg-danger/90 disabled:opacity-50" onClick={() => void submitReject(a.orgId)}>
                                {L('पुष्टि करें', 'Confirm')}
                              </button>
                              <button type="button" className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft" onClick={() => setRejectingOrgId(null)}>
                                {L('रद्द करें', 'Cancel')}
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <button type="button" className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft" onClick={() => void toggleKyc(a.orgId)}>
                                {expandedOrgId === a.orgId ? L('छुपाएं', 'Hide') : L('KYC देखें', 'View KYC')}
                              </button>
                              {a.kycStatus !== 'VERIFIED' ? (
                                <button type="button" disabled={rowBusy === a.orgId} className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50" onClick={() => void verifyKyc(a.orgId)}>
                                  {L('KYC सत्यापित करें', 'Verify KYC')}
                                </button>
                              ) : null}
                              {a.kycStatus !== 'VERIFIED' ? (
                                <button type="button" disabled={rowBusy === a.orgId} className="rounded-md border border-danger px-2 py-1 text-xs font-bold text-danger hover:bg-orange-100/50 disabled:opacity-50" onClick={() => startReject(a.orgId)}>
                                  {L('अस्वीकार करें', 'Reject KYC')}
                                </button>
                              ) : null}
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandedOrgId === a.orgId ? (
                        <tr key={`${a.id}-kyc`}>
                          <td colSpan={5} className="bg-surface-soft px-3 py-4">
                            {kycLoading === a.orgId ? (
                              <p className="text-sm text-muted">{L('लोड हो रहा है…', 'Loading…')}</p>
                            ) : !submission || !submission.kycSubmittedAt ? (
                              <p className="text-sm text-muted">{L('अभी कोई KYC सबमिट नहीं किया गया।', 'No KYC submitted yet.')}</p>
                            ) : (
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-1 text-sm">
                                  {submission.kycStatus === 'REJECTED' && submission.kycRejectionReason ? (
                                    <div className="mb-2"><Alert tone="error">{L('अस्वीकृति का कारण: ', 'Rejection reason: ')}{submission.kycRejectionReason}</Alert></div>
                                  ) : null}
                                  <div><span className="text-muted">{L('कानूनी व्यवसाय नाम: ', 'Legal business name: ')}</span><b>{submission.legalBusinessName}</b></div>
                                  <div><span className="text-muted">{L('PAN: ', 'PAN: ')}</span><b>{submission.panMasked}</b></div>
                                  {submission.gstin ? <div><span className="text-muted">GSTIN: </span><b>{submission.gstin}</b></div> : null}
                                  <div><span className="text-muted">{L('पता: ', 'Address: ')}</span><b>{[submission.addressLine1, submission.addressLine2, submission.addressCity, submission.addressState, submission.addressPincode].filter(Boolean).join(', ')}</b></div>
                                  <div><span className="text-muted">{L('बैंक खाता: ', 'Bank account: ')}</span><b>{submission.bankAccountNumberMasked}</b></div>
                                  <div><span className="text-muted">IFSC: </span><b>{submission.bankIfsc}</b></div>
                                  <div><span className="text-muted">{L('लाभार्थी: ', 'Beneficiary: ')}</span><b>{submission.beneficiaryName}</b></div>
                                  <div><span className="text-muted">{L('सबमिट किया गया: ', 'Submitted: ')}</span><b>{new Date(submission.kycSubmittedAt).toLocaleDateString('en-GB')}</b></div>
                                </div>
                                <div>
                                  <div className="mb-2 text-xs font-extrabold uppercase text-muted">{L('दस्तावेज़', 'Documents')}</div>
                                  {submission.documents.length === 0 ? (
                                    <p className="text-sm text-muted">{L('कोई दस्तावेज़ अपलोड नहीं किया गया।', 'No documents uploaded.')}</p>
                                  ) : (
                                    <div className="grid gap-1.5">
                                      {submission.documents.map((d) => (
                                        <div key={d.id} className="flex items-center justify-between rounded-md border border-line bg-white px-3 py-1.5 text-sm">
                                          <span className="truncate">{d.docType} — {d.originalFilename}</span>
                                          <button type="button" className="font-bold text-orange-600 hover:underline" onClick={() => void downloadDoc(d.id, d.originalFilename)}>
                                            {L('डाउनलोड', 'Download')}
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('हाल के ट्रांसफर', 'Recent transfers')} ({transfers.length})</h2>
        {transfers.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई ट्रांसफर नहीं।', 'No transfers yet.')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('उत्पाद', 'Product')}</th>
                  <th className="px-3 py-2">{L('चैनल', 'Channel')}</th>
                  <th className="px-3 py-2">{L('सकल', 'Gross')}</th>
                  <th className="px-3 py-2">{L('मंच शुल्क', 'Platform fee')}</th>
                  <th className="px-3 py-2">{L('संस्थान शुद्ध', 'Institute net')}</th>
                  <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 font-bold text-ink">{t.productTitle}</td>
                    <td className="px-3 py-2">{t.audience === 'INSTITUTE' ? L('आंतरिक', 'Internal') : L('बाहरी', 'External')}</td>
                    <td className="px-3 py-2">{rupees(t.grossMinor)}</td>
                    <td className="px-3 py-2">{rupees(t.platformFeeMinor)}</td>
                    <td className="px-3 py-2 font-bold">{rupees(t.netMinor)}</td>
                    <td className="px-3 py-2"><span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-extrabold text-success">{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
