'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';
import type { TicketView } from '@rajyarank/contracts';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_STUDENT', 'RESOLVED', 'CLOSED'] as const;

/** Support agent view of one ticket: reply (public/internal) + status change. */
export function TicketPanel({ ticket, locale = 'en' }: { ticket: TicketView; locale?: string }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function reply() {
    if (!body.trim()) return setErrors({ bodyText: L('कृपया उत्तर दर्ज करें।', 'Please enter a reply.') });
    setErrors({});
    setBusy(true);
    try {
      await apiFetch(`/staff/support-tickets/${ticket.id}/replies`, { method: 'POST', body: JSON.stringify({ bodyText: body, internal }) });
      setBody('');
      router.refresh();
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: string) {
    await apiFetch(`/staff/support-tickets/${ticket.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }).catch(() => undefined);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <strong className="text-navy-900">{ticket.subject}</strong>
          <div className="text-xs text-muted">{ticket.category}</div>
        </div>
        <select
          className="rounded-md border border-line px-2 py-1 text-xs font-extrabold"
          value={ticket.status}
          onChange={(e) => void setStatus(e.target.value)}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mb-2 grid gap-1">
        {ticket.replies.map((r) => (
          <p key={r.id} className={`rounded-md p-2 text-sm ${r.internal ? 'bg-orange-100/50 text-warning' : 'bg-surface-soft text-ink'}`}>
            {r.internal ? '🔒 ' : ''}{r.bodyText}
          </p>
        ))}
      </div>

      {errors._form ? <div className="mb-2"><Alert tone="error">{errors._form}</Alert></div> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void reply(); }}>
        <textarea
          aria-invalid={errors.bodyText ? true : undefined}
          aria-describedby={errors.bodyText ? `reply-error-${ticket.id}` : undefined}
          className="h-16 w-full rounded-md border border-line p-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={L('उत्तर…', 'Reply…')}
        />
        {errors.bodyText ? <p id={`reply-error-${ticket.id}`} role="alert" className="mt-1 text-sm text-danger">{errors.bodyText}</p> : null}
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> {L('आंतरिक टिप्पणी', 'Internal note')}
          </label>
          <Button type="submit" variant="secondary" loading={busy} className="min-h-[36px] px-3 text-sm">
            {L('उत्तर भेजें', 'Send reply')}
          </Button>
        </div>
      </form>
    </div>
  );
}
