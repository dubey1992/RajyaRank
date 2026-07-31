import { notFound } from 'next/navigation';

// See apps/web's identical catchAll route for why this is needed — without
// it, a genuinely unmatched staff-portal URL falls back to Next's generic
// built-in 404 instead of the custom apps/admin/app/[locale]/not-found.tsx.
export default function CatchAll() {
  notFound();
}
