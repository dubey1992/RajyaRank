'use client';
import { useEffect, useState } from 'react';
import type { LiveClassView, JoinLiveClassResponse } from '@rajyarank/contracts';
import { apiFetch, type ApiError } from '@/lib/api';

// Same interval as the lesson player's heartbeat (learn/[lessonId]/player.tsx)
// — kept in sync so a student's "how long were they actually watching" signal
// means the same thing across both features.
const HEARTBEAT_SECONDS = 20;

function timeLabel(startsAt: string, locale: 'hi' | 'en'): string {
  return new Date(startsAt).toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function ClassCard({ c, locale, onJoined }: { c: LiveClassView; locale: 'hi' | 'en'; onJoined: (id: string, embedUrl: string) => void }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const opensInMs = new Date(c.startsAt).getTime() - 10 * 60_000 - Date.now();
  // The server's own /upcoming endpoint already excludes ended classes, but
  // phase !== 'ENDED' is still checked here defensively rather than assuming
  // that filtering can never change.
  const canJoin = c.phase !== 'ENDED' && (c.phase === 'LIVE_NOW' || opensInMs <= 0);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<JoinLiveClassResponse>(`/student/live-classes/${c.id}/join`, { method: 'POST' });
      onJoined(c.id, res.url);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[18px] border border-line bg-white p-4 shadow-[0_5px_18px_rgba(6,29,49,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-extrabold text-navy-950">{hi ? c.titleHi : c.titleEn}</span>
            {c.phase === 'LIVE_NOW' ? (
              <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 text-[10px] font-extrabold text-white">{L('लाइव', 'LIVE')}</span>
            ) : null}
          </div>
          <div className="mt-0.5 text-xs text-muted">{hi ? c.courseTitleHi : c.courseTitleEn}</div>
          <div className="mt-1 text-xs font-bold text-navy-800">{timeLabel(c.startsAt, locale)} · {c.durationMinutes} {L('मिनट', 'min')}</div>
          {c.descriptionHi || c.descriptionEn ? <p className="mt-2 text-xs text-muted">{hi ? c.descriptionHi : c.descriptionEn}</p> : null}
        </div>
        <button
          onClick={() => void join()}
          disabled={!canJoin || busy}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
            canJoin ? 'bg-orange-500 text-white hover:-translate-y-0.5 hover:bg-orange-600' : 'cursor-not-allowed bg-line text-muted'
          }`}
        >
          {busy ? L('जुड़ रहे हैं…', 'Joining…') : canJoin ? L('जुड़ें', 'Join') : L('जल्द खुलेगा', 'Opens soon')}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function LiveClassesList({ classes, locale }: { classes: LiveClassView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [activeEmbed, setActiveEmbed] = useState<{ id: string; url: string } | null>(null);

  // Periodic heartbeat while the embed is open, same cadence/visibility-gate
  // as the lesson player's — lets the admin attendance roster show a real
  // "duration" instead of just a join timestamp.
  useEffect(() => {
    if (!activeEmbed) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void apiFetch(`/student/live-classes/${activeEmbed.id}/heartbeat`, { method: 'PATCH' }).catch(() => {
        // Best-effort — a missed heartbeat just means a slightly shorter
        // recorded duration, never worth interrupting the student over.
      });
    }, HEARTBEAT_SECONDS * 1000);
    return () => window.clearInterval(id);
  }, [activeEmbed]);

  const live = classes.filter((c) => c.phase === 'LIVE_NOW');
  const upcoming = classes.filter((c) => c.phase === 'UPCOMING');

  if (activeEmbed) {
    return (
      <div className="rounded-[18px] border border-line bg-black p-2">
        <div className="mb-2 flex justify-end">
          <button onClick={() => setActiveEmbed(null)} className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20">{L('बंद करें ✕', 'Close ✕')}</button>
        </div>
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <iframe
            title="Live class"
            src={activeEmbed.url}
            className="h-full w-full bg-black"
            // Same CSP/referrer gotcha as learn/[lessonId]/player.tsx's EMBED
            // case — YouTube validates the referring page as part of
            // loading; "no-referrer" fails closed with Error 153.
            referrerPolicy="strict-origin-when-cross-origin"
            allow="autoplay; encrypted-media; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return <p className="text-sm text-muted">{L('अभी कोई लाइव क्लास शेड्यूल नहीं है। बाद में फिर से देखें।', 'No live classes scheduled right now. Check back later.')}</p>;
  }

  return (
    <div className="grid gap-5">
      {live.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-danger">{L('अभी लाइव', 'Live now')}</h2>
          <div className="grid gap-2.5">{live.map((c) => <ClassCard key={c.id} c={c} locale={locale} onJoined={(id, url) => setActiveEmbed({ id, url })} />)}</div>
        </section>
      ) : null}
      {upcoming.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-navy-900">{L('आगामी', 'Upcoming')}</h2>
          <div className="grid gap-2.5">{upcoming.map((c) => <ClassCard key={c.id} c={c} locale={locale} onJoined={(id, url) => setActiveEmbed({ id, url })} />)}</div>
        </section>
      ) : null}
    </div>
  );
}
