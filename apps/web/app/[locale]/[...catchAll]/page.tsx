import { notFound } from 'next/navigation';

// Catches any path under [locale] that doesn't match a real route. Without
// this, Next.js's router falls back to its generic built-in 404 for
// genuinely unmatched URLs — nested not-found.tsx files only fire when
// notFound() is explicitly called from within a matched route (as the
// existing dynamic-route pages already do for invalid ids). This makes that
// the same for arbitrary broken/mistyped links too.
export default function CatchAll() {
  notFound();
}
