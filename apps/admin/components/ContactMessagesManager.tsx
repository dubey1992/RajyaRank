'use client';
import { useState } from 'react';
import { apiFetch, type ApiError } from '@/lib/api';
import type { ContactMessageView } from '@rajyarank/contracts';

const CATEGORY_LABEL: Record<string, { hi: string; en: string }> = {
  GENERAL: { hi: 'सामान्य प्रश्न', en: 'General enquiry' },
  INSTITUTION_PARTNERSHIP: { hi: 'संस्थान साझेदारी', en: 'Institution partnership' },
  STUDENT_SUPPORT: { hi: 'छात्र सहायता', en: 'Student support' },
  PRESS: { hi: 'प्रेस / मीडिया', en: 'Press / media' },
  OTHER: { hi: 'अन्य', en: 'Other' },
};

export function ContactMessagesManager({ initial, locale }: { initial: ContactMessageView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [rows, setRows] = useState<ContactMessageView[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await apiFetch<ContactMessageView>(`/staff/contact-messages/${id}/resolve`, { method: 'PATCH' });
      setRows((r) => r.map((x) => (x.id === id ? updated : x)));
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted">{L('अभी कोई संदेश नहीं है।', 'No messages yet.')}</p>;
  }

  return (
    <div className="grid gap-3">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {rows.map((m) => (
        <div key={m.id} className="rounded-lg border border-line bg-white p-4">
          <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
            <div>
              <strong className="text-navy-900">{m.name}</strong>
              <span className="ml-2 text-xs text-muted">{m.email}{m.phone ? ` · ${m.phone}` : ''}</span>
              <div className="mt-0.5 text-xs font-bold text-orange-600">{hi ? CATEGORY_LABEL[m.category]?.hi : CATEGORY_LABEL[m.category]?.en}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${m.status === 'RESOLVED' ? 'bg-teal-100 text-success' : 'bg-orange-100 text-orange-600'}`}>
                {m.status === 'RESOLVED' ? L('हल हो गया', 'Resolved') : L('नया', 'New')}
              </span>
              {m.status !== 'RESOLVED' ? (
                <button
                  type="button"
                  disabled={busyId === m.id}
                  onClick={() => void resolve(m.id)}
                  className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:bg-surface-soft disabled:opacity-50"
                >
                  {L('हल के रूप में चिह्नित करें', 'Mark resolved')}
                </button>
              ) : null}
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm text-ink">{m.message}</p>
          <p className="mt-2 text-xs text-muted">{new Date(m.createdAt).toLocaleString(hi ? 'hi-IN' : 'en-IN')}</p>
        </div>
      ))}
    </div>
  );
}
