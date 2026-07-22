'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';

type Action =
  | { kind: 'start-review' }
  | { kind: 'approve' }
  | { kind: 'request-correction' }
  | { kind: 'submit' }
  | { kind: 'publish' };

/**
 * Reviewer/teacher workflow buttons. These are UX affordances only — the
 * backend re-authorizes every transition (capability + scope + status + MFA)
 * and returns 403 PERMISSION_DENIED / 409 CONTENT_STATE_INVALID regardless.
 */
export function WorkflowActions({ versionId, actions }: { versionId: string; actions: Action[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(a: Action) {
    setBusy(a.kind);
    setMsg(null);
    try {
      const path = `/staff/content/versions/${versionId}/${a.kind}`;
      const body =
        a.kind === 'request-correction' ? JSON.stringify({ body: 'Please revise.' }) : undefined;
      await apiFetch(path, { method: 'POST', body });
      router.refresh();
    } catch (e) {
      setMsg((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  const label: Record<Action['kind'], string> = {
    'start-review': 'Start review',
    approve: 'Approve',
    'request-correction': 'Request correction',
    submit: 'Submit for review',
    publish: 'Publish',
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <Button
          key={a.kind}
          variant={a.kind === 'approve' || a.kind === 'publish' ? 'secondary' : 'outline'}
          loading={busy === a.kind}
          onClick={() => void run(a)}
          className="min-h-[36px] px-3 text-sm"
        >
          {label[a.kind]}
        </Button>
      ))}
      {msg ? <span className="text-sm text-danger">{msg}</span> : null}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-line text-ink',
  SUBMITTED: 'bg-orange-100 text-orange-600',
  UNDER_REVIEW: 'bg-orange-100 text-warning',
  CORRECTION_REQUIRED: 'bg-orange-100 text-danger',
  APPROVED: 'bg-teal-100 text-teal-600',
  PUBLISHED: 'bg-teal-100 text-success',
  REJECTED: 'bg-orange-100 text-danger',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-extrabold ${STATUS_TONE[status] ?? 'bg-line text-ink'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
