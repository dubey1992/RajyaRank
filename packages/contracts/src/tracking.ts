import { z } from 'zod';

/** Public endpoint for ad-conversion events that have no natural backend
 *  request of their own (the quiz and course-page views are pure client-side
 *  interactions) — relayed server-side to Meta Conversions API so they're
 *  still reported when a browser blocks the client-side Pixel. Events that
 *  DO have a real backend request (checkout started, payment done) are fired
 *  from those existing endpoints instead — see payments.service.ts. */
export const trackMetaEventSchema = z.object({
  eventName: z.enum(['Lead', 'ViewContent']),
  // Shared with the matching client-side fbq() call so Meta dedupes the two
  // reports of the same real action.
  eventId: z.string().min(1).max(100),
  eventSourceUrl: z.string().url(),
  contentId: z.string().max(200).optional(),
  contentName: z.string().max(200).optional(),
  // Meta's own browser cookies (_fbp/_fbc), forwarded so this server-side
  // report matches back to the same browser the Pixel saw.
  fbp: z.string().max(200).optional(),
  fbc: z.string().max(200).optional(),
});
export type TrackMetaEvent = z.infer<typeof trackMetaEventSchema>;
