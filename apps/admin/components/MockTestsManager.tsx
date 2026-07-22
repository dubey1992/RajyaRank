'use client';
import { useEffect, useState } from 'react';
import { Alert, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { can } from '@/lib/permissions';
import type { MeResponse, TestListItem } from '@rajyarank/contracts';
import { CreateContentWizard } from './CreateContentWizard';
import { TestPreviewModal } from './TestPreviewModal';

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-line text-muted',
  SUBMITTED: 'bg-orange-100 text-orange-700',
  UNDER_REVIEW: 'bg-orange-100 text-orange-700',
  CORRECTION_REQUIRED: 'bg-orange-100 text-danger',
  APPROVED: 'bg-teal-100 text-success',
  PUBLISHED: 'bg-teal-100 text-success',
  SUPERSEDED: 'bg-line text-muted',
};

export function MockTestsManager({ initialTests, me, locale }: { initialTests: TestListItem[]; me: MeResponse; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [tests, setTests] = useState(initialTests);
  // The CreateContentWizard's post-create router.refresh() re-fetches this
  // page's server data (a fresh initialTests prop), but a plain useState
  // only reads its initial value once — without this, a newly created test
  // stays invisible until a full manual reload (same fix as StaffTable.tsx).
  useEffect(() => setTests(initialTests), [initialTests]);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const isHead = me.roleKeys.includes('ACADEMIC_HEAD');
  const isReviewer = me.roleKeys.includes('ACADEMIC_REVIEWER');
  const canApprove = can(me, 'content.approve') && (isHead || isReviewer);
  const canPublish = can(me, 'content.publish');
  const canCreate = can(me, 'test.create');

  function patchVersion(testId: string, patch: Partial<NonNullable<TestListItem['currentVersion']>>) {
    setTests((rows) =>
      rows.map((t) => (t.id === testId && t.currentVersion ? { ...t, currentVersion: { ...t.currentVersion, ...patch } } : t)),
    );
  }

  async function runAction(testVersionId: string, testId: string, action: () => Promise<Partial<NonNullable<TestListItem['currentVersion']>> & { status: string }>) {
    setRowBusy(testVersionId);
    setError(null);
    try {
      const updated = await action();
      patchVersion(testId, updated);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setRowBusy(null);
    }
  }

  function submitTest(t: TestListItem) {
    if (!t.currentVersion) return;
    void runAction(t.currentVersion.id, t.id, async () => {
      const updated = await apiFetch<{ status: string }>(`/staff/tests/versions/${t.currentVersion!.id}/submit`, { method: 'POST' });
      setToast(L('समीक्षा हेतु सबमिट किया गया।', 'Submitted for review.'));
      return { status: updated.status, rejectionReason: null };
    });
  }

  function approveTest(t: TestListItem) {
    if (!t.currentVersion) return;
    void runAction(t.currentVersion.id, t.id, async () => {
      const updated = await apiFetch<{ status: string; headApprovedBy: string | null; reviewerApprovedBy: string | null }>(
        `/staff/tests/versions/${t.currentVersion!.id}/approve`,
        { method: 'POST' },
      );
      setToast(L('स्वीकृत — अब प्रकाशित किया जा सकता है।', 'Approved — this can now be published.'));
      return updated;
    });
  }

  function startReject(testVersionId: string) {
    setRejectingId(testVersionId);
    setRejectReason('');
    setError(null);
  }

  function submitReject(t: TestListItem) {
    if (!t.currentVersion) return;
    if (rejectReason.trim().length < 5) {
      setError(L('कारण कम से कम 5 अक्षर का होना चाहिए।', 'Reason must be at least 5 characters.'));
      return;
    }
    void runAction(t.currentVersion.id, t.id, async () => {
      const updated = await apiFetch<{ status: string }>(`/staff/tests/versions/${t.currentVersion!.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      setRejectingId(null);
      setToast(L('मॉक टेस्ट अस्वीकृत कर दिया गया।', 'Mock test rejected.'));
      return { status: updated.status, rejectionReason: rejectReason.trim(), headApprovedBy: null, reviewerApprovedBy: null };
    });
  }

  function publishTest(t: TestListItem) {
    if (!t.currentVersion) return;
    void runAction(t.currentVersion.id, t.id, async () => {
      const updated = await apiFetch<{ status: string }>(`/staff/tests/versions/${t.currentVersion!.id}/publish`, { method: 'POST' });
      setToast(L('मॉक टेस्ट प्रकाशित — अब छात्रों को दिखेगा।', 'Mock test published — now visible to students.'));
      return { status: updated.status };
    });
  }

  return (
    <div className="grid gap-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          {hi
            ? 'आपके दायरे में सभी मॉक टेस्ट। प्रकाशित होने से पहले किसी एक एकेडमिक हेड या रिव्यूअर की स्वीकृति चाहिए।'
            : 'All mock tests in your scope. Publishing requires approval from an Academic Head or an Academic Reviewer.'}
          {canCreate
            ? hi
              ? ' "नया कंटेंट बनाएँ" से मौजूदा प्रश्न चुनकर या CSV बल्क-अपलोड करके एक मॉक टेस्ट बनाएँ।'
              : ' Use "Create content" to build one — pick existing questions or bulk-upload via CSV.'
            : null}
        </p>
        {canCreate ? <CreateContentWizard locale={locale} allowedTypes={['QUIZ']} /> : null}
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {tests.length === 0 ? (
        <p className="text-sm text-muted">{L('अभी कोई मॉक टेस्ट नहीं।', 'No mock tests yet.')}</p>
      ) : (
        <ul className="grid gap-2 text-sm">
          {tests.map((t) => {
            const cv = t.currentVersion;
            const status = cv?.status ?? '—';
            const busy = rowBusy === cv?.id;
            const canSubmit = can(me, 'test.create') && (status === 'DRAFT' || status === 'CORRECTION_REQUIRED');
            const showApprove = canApprove && (status === 'SUBMITTED' || status === 'UNDER_REVIEW') && !((isHead && cv?.headApprovedBy) || (isReviewer && cv?.reviewerApprovedBy));
            const showReject = canApprove && (status === 'SUBMITTED' || status === 'UNDER_REVIEW');
            const showPublish = canPublish && status === 'APPROVED';

            return (
              <li key={t.id} className="rounded-md border border-line bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-ink">{hi ? t.titleHi : t.titleEn}</div>
                    <div className="text-xs text-muted">{t.type} · {cv?.durationMinutes ?? '—'} {hi ? 'मिनट' : 'min'}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {status === 'SUBMITTED' || status === 'UNDER_REVIEW' || status === 'APPROVED' ? (
                      <>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${cv?.headApprovedBy ? 'bg-teal-100 text-success' : 'bg-line text-muted'}`}>
                          {L('हेड', 'Head')} {cv?.headApprovedBy ? '✓' : '—'}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${cv?.reviewerApprovedBy ? 'bg-teal-100 text-success' : 'bg-line text-muted'}`}>
                          {L('रिव्यूअर', 'Reviewer')} {cv?.reviewerApprovedBy ? '✓' : '—'}
                        </span>
                      </>
                    ) : null}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${STATUS_TONE[status] ?? 'bg-line text-muted'}`}>{status}</span>
                  </div>
                </div>

                {cv?.rejectionReason ? (
                  <div className="mt-2"><Alert tone="error">{L('अस्वीकृति का कारण: ', 'Rejection reason: ')}{cv.rejectionReason}</Alert></div>
                ) : null}

                {rejectingId === cv?.id ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={L('अस्वीकृति का कारण…', 'Reason for rejection…')}
                      rows={2}
                      className="w-72 rounded-md border border-line px-2 py-1 text-xs outline-none focus:border-orange-500"
                    />
                    <button type="button" disabled={busy} onClick={() => submitReject(t)} className="rounded-md bg-danger px-2 py-1 text-xs font-bold text-white hover:bg-danger/90 disabled:opacity-50">
                      {L('पुष्टि करें', 'Confirm')}
                    </button>
                    <button type="button" onClick={() => setRejectingId(null)} className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft">
                      {L('रद्द करें', 'Cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {cv ? (
                      <button type="button" onClick={() => setPreviewId(cv.id)} className="rounded-md border border-line px-2 py-1 text-xs font-bold text-ink hover:bg-surface-soft">
                        {L('प्रश्न देखें', 'View questions')}
                      </button>
                    ) : null}
                    {canSubmit ? (
                      <button type="button" disabled={busy} onClick={() => submitTest(t)} className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50">
                        {L('समीक्षा हेतु सबमिट करें', 'Submit for review')}
                      </button>
                    ) : null}
                    {showApprove ? (
                      <button type="button" disabled={busy} onClick={() => approveTest(t)} className="rounded-md border border-teal-300 bg-teal-50 px-2 py-1 text-xs font-bold text-success hover:bg-teal-100 disabled:opacity-50">
                        {isHead && isReviewer
                          ? L('स्वीकृत करें', 'Approve')
                          : isHead
                            ? L('हेड के रूप में स्वीकृत करें', 'Approve as Head')
                            : L('रिव्यूअर के रूप में स्वीकृत करें', 'Approve as Reviewer')}
                      </button>
                    ) : null}
                    {showReject ? (
                      <button type="button" disabled={busy} onClick={() => startReject(cv!.id)} className="rounded-md border border-danger px-2 py-1 text-xs font-bold text-danger hover:bg-orange-100/50 disabled:opacity-50">
                        {L('अस्वीकार करें', 'Reject')}
                      </button>
                    ) : null}
                    {showPublish ? (
                      <button type="button" disabled={busy} onClick={() => publishTest(t)} className="rounded-md bg-orange-500 px-2 py-1 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50">
                        {L('छात्रों हेतु प्रकाशित करें', 'Publish to students')}
                      </button>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
      {previewId ? <TestPreviewModal testVersionId={previewId} locale={locale} onClose={() => setPreviewId(null)} /> : null}
    </div>
  );
}
