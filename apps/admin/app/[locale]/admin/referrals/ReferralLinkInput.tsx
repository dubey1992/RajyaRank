'use client';

export function ReferralLinkInput({ value }: { value: string }) {
  return (
    <input
      readOnly
      value={value}
      onFocus={(e) => e.currentTarget.select()}
      className="w-full rounded-md border border-line bg-surface-soft px-3 py-2 text-sm text-ink"
    />
  );
}
