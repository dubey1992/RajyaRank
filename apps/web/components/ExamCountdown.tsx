'use client';
import { useEffect, useState } from 'react';

/** Live days/hours/minutes remaining until the target-exam date. */
export function ExamCountdown({ iso, locale }: { iso: string; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const target = new Date(iso).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, target - (now ?? target));
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);

  const boxes: [number, string][] = [
    [days, hi ? 'दिन' : 'Days'],
    [hours, hi ? 'घंटे' : 'Hours'],
    [mins, hi ? 'मिनट' : 'Mins'],
  ];

  return (
    <div className="flex gap-2">
      {boxes.map(([val, label]) => (
        <div key={label} className="min-w-[56px] rounded-xl border border-white/15 bg-white/10 px-2 py-2 text-center">
          <strong className="block text-[17px]">{now === null ? '—' : String(val).padStart(2, '0')}</strong>
          <small className="text-[8.5px] uppercase text-[#bdd2df]">{label}</small>
        </div>
      ))}
    </div>
  );
}
