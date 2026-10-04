'use client';

// error.tsx is forced to be a Client Component by Next.js and gets no route
// params — unlike not-found.tsx (a Server Component that reads the locale
// from middleware's x-pathname header), there's no clean way to know which
// locale to show here. Shows both languages at once instead, same approach
// as this app's public/offline.html fallback page.
//
// This is the boundary a transient 5xx from apiFetchServer now lands on
// (see apps/web/lib/api.ts) instead of being silently treated as "not
// logged in" and bounced to the login page — the single-sentence fix for
// "users get logged out when production deploys": an ALB briefly returning
// 502/503/504 while swapping task targets mid-deploy is not the same thing
// as an invalid session, and shouldn't be handled as one.
export default function WebError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-black text-navy-950 md:text-2xl">कुछ गड़बड़ हो गई</h1>
      <p className="mt-1 text-xl font-black text-navy-950 md:text-2xl">Something went wrong</p>
      <p className="mt-3 max-w-sm text-sm text-muted">
        यह अक्सर कुछ ही पल में ठीक हो जाता है — खासकर अभी सर्वर अपडेट हो रहा हो तो। फिर से कोशिश करें।
      </p>
      <p className="mt-2 max-w-sm text-sm text-muted">
        This usually resolves within moments — especially if the server is mid-update right now. Try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 font-extrabold text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 hover:bg-orange-600"
      >
        फिर से कोशिश करें · Try again
      </button>
    </main>
  );
}
