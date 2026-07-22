'use client';
import { useState } from 'react';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { KycDocType, KycDocumentUploadIntentResponse, KycSubmissionView } from '@rajyarank/contracts';

const DOC_TYPES: { key: KycDocType; hi: string; en: string }[] = [
  { key: 'PAN_CARD', hi: 'PAN कार्ड', en: 'PAN card' },
  { key: 'ADDRESS_PROOF', hi: 'पता प्रमाण', en: 'Address proof' },
  { key: 'BANK_PROOF', hi: 'बैंक प्रमाण (रद्द चेक / पासबुक)', en: 'Bank proof (cancelled cheque / passbook)' },
];

export function KycSubmissionForm({
  initial,
  defaultLegalName,
  locale,
}: {
  initial: KycSubmissionView | null;
  defaultLegalName: string;
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const [legalBusinessName, setLegalBusinessName] = useState(initial?.legalBusinessName ?? defaultLegalName);
  const [pan, setPan] = useState('');
  const [gstin, setGstin] = useState(initial?.gstin ?? '');
  const [addressLine1, setAddressLine1] = useState(initial?.addressLine1 ?? '');
  const [addressLine2, setAddressLine2] = useState(initial?.addressLine2 ?? '');
  const [addressCity, setAddressCity] = useState(initial?.addressCity ?? '');
  const [addressState, setAddressState] = useState(initial?.addressState ?? '');
  const [addressPincode, setAddressPincode] = useState(initial?.addressPincode ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountNumberConfirm, setBankAccountNumberConfirm] = useState('');
  const [bankIfsc, setBankIfsc] = useState(initial?.bankIfsc ?? '');
  const [beneficiaryName, setBeneficiaryName] = useState(initial?.beneficiaryName ?? '');
  const [consent, setConsent] = useState(false);

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [submission, setSubmission] = useState<KycSubmissionView | null>(initial);
  const [uploadingType, setUploadingType] = useState<KycDocType | null>(null);

  async function uploadDocument(docType: KycDocType, file: File) {
    setUploadingType(docType);
    setErrors({});
    try {
      const intent = await apiFetch<KycDocumentUploadIntentResponse>('/academic/settlements/kyc/documents', {
        method: 'POST',
        body: JSON.stringify({ docType, fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
      });
      const put = await fetch(intent.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
      if (!put.ok) throw new Error('Upload to storage failed.');
      // Only recorded (and only replaces the prior doc of this type) once the
      // PUT above is confirmed to have actually landed — an abandoned upload
      // must never show up as if it succeeded.
      await apiFetch('/academic/settlements/kyc/documents/confirm', {
        method: 'POST',
        body: JSON.stringify({
          documentId: intent.documentId,
          storageKey: intent.storageKey,
          docType,
          originalFilename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      setToast(L('दस्तावेज़ अपलोड हुआ।', 'Document uploaded.'));
      setSubmission((s) =>
        s
          ? {
              ...s,
              documents: [
                { id: intent.documentId, docType, originalFilename: file.name, uploadedAt: new Date().toISOString() },
                ...s.documents.filter((d) => d.docType !== docType),
              ],
            }
          : s,
      );
    } catch (e) {
      setErrors({ _form: (e as ApiError).message ?? L('अपलोड विफल रहा।', 'Upload failed.') });
    } finally {
      setUploadingType(null);
    }
  }

  async function submit() {
    const errs: Record<string, string> = {};
    if (legalBusinessName.trim().length < 2) errs.legalBusinessName = L('कानूनी व्यवसाय नाम दर्ज करें।', 'Enter the legal business name.');
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.trim().toUpperCase())) errs.pan = L('मान्य PAN दर्ज करें (जैसे ABCDE1234F)।', 'Enter a valid PAN (e.g. ABCDE1234F).');
    if (addressLine1.trim().length < 2) errs.addressLine1 = L('पता दर्ज करें।', 'Enter the address.');
    if (addressCity.trim().length < 2) errs.addressCity = L('शहर दर्ज करें।', 'Enter the city.');
    if (addressState.trim().length < 2) errs.addressState = L('राज्य दर्ज करें।', 'Enter the state.');
    if (!/^\d{6}$/.test(addressPincode.trim())) errs.addressPincode = L('मान्य 6-अंकीय पिनकोड दर्ज करें।', 'Enter a valid 6-digit pincode.');
    if (!/^\d{6,20}$/.test(bankAccountNumber.trim())) errs.bankAccountNumber = L('मान्य बैंक खाता संख्या दर्ज करें।', 'Enter a valid bank account number.');
    if (bankAccountNumber.trim() !== bankAccountNumberConfirm.trim()) errs.bankAccountNumberConfirm = L('खाता संख्या मेल नहीं खाती।', 'Account numbers do not match.');
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc.trim().toUpperCase())) errs.bankIfsc = L('मान्य IFSC कोड दर्ज करें।', 'Enter a valid IFSC code.');
    if (beneficiaryName.trim().length < 2) errs.beneficiaryName = L('लाभार्थी का नाम दर्ज करें।', "Enter the beneficiary's name.");
    if (!consent) errs.consent = L('कृपया पुष्टि करें कि विवरण सही हैं।', 'Please confirm the details are accurate.');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const result = await apiFetch<KycSubmissionView>('/academic/settlements/kyc', {
        method: 'POST',
        body: JSON.stringify({
          legalBusinessName: legalBusinessName.trim(),
          pan: pan.trim().toUpperCase(),
          gstin: gstin.trim().toUpperCase(),
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim(),
          addressCity: addressCity.trim(),
          addressState: addressState.trim(),
          addressPincode: addressPincode.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankIfsc: bankIfsc.trim().toUpperCase(),
          beneficiaryName: beneficiaryName.trim(),
          consent,
        }),
      });
      setSubmission(result);
      setPan('');
      setBankAccountNumber('');
      setBankAccountNumberConfirm('');
      setToast(L('KYC विवरण सबमिट कर दिया गया।', 'KYC details submitted.'));
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      {submission?.kycSubmittedAt ? (
        <Alert tone={submission.kycStatus === 'VERIFIED' ? 'success' : submission.kycStatus === 'REJECTED' ? 'error' : 'info'}>
          {submission.kycStatus === 'VERIFIED'
            ? L('KYC सत्यापित है। भुगतान सक्षम हैं।', 'KYC is verified. Payouts are enabled.')
            : submission.kycStatus === 'REJECTED'
              ? L(
                  `आपका KYC अस्वीकृत कर दिया गया: ${submission.kycRejectionReason ?? ''} — कृपया नीचे विवरण ठीक करें और दोबारा सबमिट करें।`,
                  `Your KYC was rejected: ${submission.kycRejectionReason ?? ''} — please fix the details below and resubmit.`,
                )
              : L(
                  `KYC ${new Date(submission.kycSubmittedAt).toLocaleDateString('en-GB')} को सबमिट किया गया — सत्यापन लंबित है।`,
                  `KYC submitted on ${new Date(submission.kycSubmittedAt).toLocaleDateString('en-GB')} — verification pending.`,
                )}
        </Alert>
      ) : (
        <Alert tone="info">
          {L('भुगतान सक्षम करने के लिए अपने संस्थान का KYC विवरण नीचे सबमिट करें।', "Submit your institution's KYC details below to enable payouts.")}
        </Alert>
      )}

      {errors._form ? <Alert tone="error">{errors._form}</Alert> : null}

      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="grid gap-1 sm:grid-cols-2 sm:gap-x-4">
        <div className="sm:col-span-2">
          <Field label={L('कानूनी व्यवसाय नाम', 'Legal business name')} name="legalBusinessName" value={legalBusinessName} error={errors.legalBusinessName} onChange={(e) => setLegalBusinessName(e.target.value)} />
        </div>
        <Field label={L('PAN', 'PAN')} name="pan" value={pan} error={errors.pan} placeholder={submission?.panMasked ?? 'ABCDE1234F'} onChange={(e) => setPan(e.target.value.toUpperCase())} />
        <Field label={L('GSTIN (वैकल्पिक)', 'GSTIN (optional)')} name="gstin" value={gstin} error={errors.gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} />

        <div className="sm:col-span-2">
          <Field label={L('पता पंक्ति 1', 'Address line 1')} name="addressLine1" value={addressLine1} error={errors.addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Field label={L('पता पंक्ति 2 (वैकल्पिक)', 'Address line 2 (optional)')} name="addressLine2" value={addressLine2} error={errors.addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
        </div>
        <Field label={L('शहर', 'City')} name="addressCity" value={addressCity} error={errors.addressCity} onChange={(e) => setAddressCity(e.target.value)} />
        <Field label={L('राज्य', 'State')} name="addressState" value={addressState} error={errors.addressState} onChange={(e) => setAddressState(e.target.value)} />
        <Field label={L('पिनकोड', 'Pincode')} name="addressPincode" inputMode="numeric" maxLength={6} value={addressPincode} error={errors.addressPincode} onChange={(e) => setAddressPincode(e.target.value.replace(/\D/g, ''))} />

        <Field
          label={L('बैंक खाता संख्या', 'Bank account number')}
          name="bankAccountNumber"
          value={bankAccountNumber}
          error={errors.bankAccountNumber}
          placeholder={submission?.bankAccountNumberMasked ?? undefined}
          onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
        />
        <Field
          label={L('खाता संख्या की पुष्टि करें', 'Confirm account number')}
          name="bankAccountNumberConfirm"
          value={bankAccountNumberConfirm}
          error={errors.bankAccountNumberConfirm}
          onChange={(e) => setBankAccountNumberConfirm(e.target.value.replace(/\D/g, ''))}
        />
        <Field label={L('IFSC कोड', 'IFSC code')} name="bankIfsc" value={bankIfsc} error={errors.bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase())} />
        <Field label={L('लाभार्थी का नाम', "Beneficiary's name")} name="beneficiaryName" value={beneficiaryName} error={errors.beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} />

        <label className="col-span-2 mb-3 mt-1 flex cursor-pointer items-start gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line accent-orange-500" />
          {L('मैं पुष्टि करता/करती हूं कि उपरोक्त विवरण सही हैं।', 'I confirm the details above are accurate.')}
        </label>
        {errors.consent ? <p className="col-span-2 -mt-2 mb-3 text-sm text-danger">{errors.consent}</p> : null}

        <div className="col-span-2">
          <Button type="submit" loading={busy} className="w-full sm:w-auto">
            {submission?.kycSubmittedAt ? L('विवरण अपडेट करें', 'Update details') : L('KYC सबमिट करें', 'Submit KYC')}
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-line bg-surface-soft p-4">
        <h3 className="mb-3 text-sm font-extrabold text-navy-900">{L('सहायक दस्तावेज़', 'Supporting documents')}</h3>
        <div className="grid gap-2">
          {DOC_TYPES.map((d) => {
            const existing = submission?.documents.find((doc) => doc.docType === d.key);
            return (
              <div key={d.key} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-white p-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-ink">{hi ? d.hi : d.en}</div>
                  <div className="truncate text-xs text-muted">
                    {existing ? `${L('अपलोड किया गया', 'Uploaded')}: ${existing.originalFilename}` : L('अभी अपलोड नहीं किया गया', 'Not uploaded yet')}
                  </div>
                </div>
                <label className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-xs font-bold text-navy-900 hover:bg-surface-soft">
                  {uploadingType === d.key ? L('अपलोड हो रहा है…', 'Uploading…') : existing ? L('फिर से अपलोड करें', 'Re-upload') : L('अपलोड करें', 'Upload')}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="hidden"
                    disabled={uploadingType !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void uploadDocument(d.key, file);
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
