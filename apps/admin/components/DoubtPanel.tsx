'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { DoubtView } from '@rajyarank/contracts';

const STATUS_TONE: Record<string, string> = {
  OPEN: 'bg-[#fff7d6] text-[#966700]',
  ASSIGNED: 'bg-orange-100 text-warning',
  ANSWERED: 'bg-teal-100 text-teal-600',
  RESOLVED: 'bg-teal-100 text-success',
  REOPENED: 'bg-orange-100 text-danger',
  CLOSED: 'bg-[#eef2f4] text-muted',
};

/** Staff (doubt.respond) view of one doubt: reply + resolve. Once replied to
 *  or resolved, staffQueue() no longer returns it (only OPEN/ASSIGNED/
 *  REOPENED count as pending) — router.refresh() drops it from the list. */
export function DoubtPanel({ doubt, locale = 'en' }: { doubt: DoubtView; locale?: string }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function reply() {
    if (!body.trim()) return setErrors({ bodyText: L('कृपया उत्तर दर्ज करें।', 'Please enter a reply.') });
    setErrors({});
    setBusy(true);
    try {
      await apiFetch(`/staff/doubts/${doubt.id}/replies`, { method: 'POST', body: JSON.stringify({ bodyText: body }) });
      setBody('');
      router.refresh();
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function resolve() {
    setResolving(true);
    await apiFetch(`/staff/doubts/${doubt.id}/resolve`, { method: 'POST' }).catch(() => undefined);
    setResolving(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-navy-900">{doubt.bodyText}</p>
        <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-black ${STATUS_TONE[doubt.status] ?? 'bg-line'}`}>{doubt.status}</span>
      </div>
      <div className="text-xs text-muted">{new Date(doubt.createdAt).toLocaleString(hi ? 'hi-IN' : 'en-IN')}</div>

      {doubt.replies.length ? (
        <div className="mt-2 grid gap-1">
          {doubt.replies.map((r) => (
            <p key={r.id} className="rounded-md bg-surface-soft p-2 text-sm text-ink">↳ {r.bodyText}</p>
          ))}
        </div>
      ) : null}

      {errors._form ? <div className="mt-2"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void reply(); }} className="mt-3">
        <textarea
          aria-invalid={errors.bodyText ? true : undefined}
          aria-describedby={errors.bodyText ? `doubt-reply-error-${doubt.id}` : undefined}
          className="h-16 w-full rounded-md border border-line p-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={L('उत्तर…', 'Reply…')}
        />
        {errors.bodyText ? <p id={`doubt-reply-error-${doubt.id}`} role="alert" className="mt-1 text-sm text-danger">{errors.bodyText}</p> : null}
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => void resolve()} loading={resolving} className="min-h-[36px] px-3 text-sm">
            {L('समाधान हुआ', 'Mark resolved')}
          </Button>
          <Button type="submit" loading={busy} className="min-h-[36px] px-3 text-sm">
            {L('उत्तर भेजें', 'Send reply')}
          </Button>
        </div>
      </form>
    </div>
  );
}
