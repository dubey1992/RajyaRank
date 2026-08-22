'use client';
import { useEffect } from 'react';
import { captureAttributionOnce } from '@/lib/attribution';

/** Mounted once in the root layout so first-touch attribution is captured
 *  no matter which page a visitor lands on first (a blog post, the
 *  homepage, a campaign link) — not just the request-demo/contact pages. */
export function AttributionCapture() {
  useEffect(() => {
    captureAttributionOnce();
  }, []);
  return null;
}
