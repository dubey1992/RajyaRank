'use client';
import { useEffect } from 'react';
import { getFacebookBrowserIds, newEventId, trackPixelEvent } from '@/lib/analytics';
import { apiFetch } from '@/lib/api';

/** Fires "course page viewed" (Meta's ViewContent) once per mount — both the
 *  client-side Pixel event and a server-side Conversions API mirror (via the
 *  generic /tracking/meta-event relay, since a page view has no backend
 *  request of its own). Mounted invisibly on the course detail page. */
export function TrackViewContent({
  contentId,
  contentName,
  value,
  currency,
}: {
  contentId: string;
  contentName: string;
  value?: number;
  currency?: string;
}) {
  useEffect(() => {
    const eventId = newEventId();
    trackPixelEvent('ViewContent', eventId, {
      content_ids: [contentId],
      content_name: contentName,
      content_type: 'product',
      ...(value != null ? { value, currency: currency ?? 'INR' } : {}),
    });
    const { fbp, fbc } = getFacebookBrowserIds();
    void apiFetch('/tracking/meta-event', {
      method: 'POST',
      body: JSON.stringify({
        eventName: 'ViewContent',
        eventId,
        eventSourceUrl: window.location.href,
        contentId,
        contentName,
        fbp,
        fbc,
      }),
    }).catch(() => {}); // best-effort — never blocks or breaks the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  return null;
}
