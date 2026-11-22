'use client';
import { useEffect, useState } from 'react';
import { Button } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { IndividualPricingView } from '@rajyarank/contracts';

/** Compact "sell this individually" toggle + price editor, used on a single
 *  lesson or test row in the admin UI — the student-facing side is
 *  CourseSyllabus.tsx's inline BuyButton (apps/web). */
export function IndividualPricingControl({ kind, id, locale }: { kind: 'lessons' | 'tests'; id: string; locale: string }) {
  const hi = locale === 'hi';
  const [open, setOpen] = useState(false);
  const [pricing, setPricing] = useState<IndividualPricingView | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<IndividualPricingView>(`/admin/${kind}/${id}/individual-pricing`)
      .then((p) => {
        setPricing(p);
        if (p.priceMinor != null) setPriceInput(String(p.priceMinor / 100));
      })
      .catch(() => {});
  }, [kind, id]);

  async function save(enabled: boolean) {
    setBusy(true);
    setError('');
    try {
      const priceMinor = Math.round(Number(priceInput || '0') * 100);
      const updated = await apiFetch<IndividualPricingView>(`/admin/${kind}/${id}/individual-pricing`, {
        method: 'PUT',
        body: JSON.stringify({ enabled, priceMinor, audience: 'PUBLIC' }),
      });
      setPricing(updated);
      if (!enabled) setOpen(false);
    } catch (e) {
      setError((e as ApiError).message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-extrabold ${pricing?.enabled ? 'bg-teal-100 text-success' : 'bg-surface-soft text-muted'}`}
      >
        {pricing?.enabled ? `₹${(pricing.priceMinor! / 100).toFixed(0)}` : hi ? 'अलग से बेचें' : 'Sell individually'}
      </button>
    );
  }

  return (
    <span className="ml-auto flex flex-none items-center gap-1.5 rounded bg-surface-soft p-1">
      <input
        type="number"
        min={0}
        value={priceInput}
        onChange={(e) => setPriceInput(e.target.value)}
        placeholder="₹"
        className="h-6 w-16 rounded border border-line px-1.5 text-[11px]"
      />
      <Button variant="primary" className="h-6 min-h-0 px-2 text-[10px]" loading={busy} onClick={() => void save(true)}>
        {hi ? 'सेव' : 'Save'}
      </Button>
      {pricing?.enabled ? (
        <Button variant="outline" className="h-6 min-h-0 px-2 text-[10px]" loading={busy} onClick={() => void save(false)}>
          {hi ? 'हटाएँ' : 'Remove'}
        </Button>
      ) : null}
      <button type="button" onClick={() => setOpen(false)} className="text-[10px] font-bold text-muted">
        ✕
      </button>
      {error ? <span className="text-[10px] font-bold text-danger">{error}</span> : null}
    </span>
  );
}
