import { z } from 'zod';

/** Live Classes — scheduled YouTube-Live sessions under a course. Access is
 *  gated by the existing course-level Entitlement, same as recorded lessons;
 *  "phase" is always derived from the clock, never stored — only a
 *  host-triggered cancellation is a durable status. */
export type LiveClassPhase = 'UPCOMING' | 'LIVE_NOW' | 'ENDED';

export interface LiveClassView {
  id: string;
  courseId: string;
  courseTitleHi: string;
  courseTitleEn: string;
  titleHi: string;
  titleEn: string;
  descriptionHi: string | null;
  descriptionEn: string | null;
  startsAt: string;
  durationMinutes: number;
  embedUrl: string;
  status: 'SCHEDULED' | 'CANCELLED';
  phase: LiveClassPhase;
  publishedLessonId: string | null;
  attendeeCount: number;
  hostName: string;
  // Display-only — never consulted for access control (join() stays
  // course-level). Omitted when not set.
  batchId?: string | null;
  batchNameHi?: string | null;
  batchNameEn?: string | null;
  // Record-keeping only — never consulted for stream delivery.
  coHostUserId?: string | null;
  coHostName?: string | null;
}

const repeatSchema = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY']),
  // Inclusive end date — the loop in LiveClassesService#create stops once an
  // occurrence's startsAt would land after this date.
  until: z.string().datetime(),
});

export const createLiveClassSchema = z.object({
  courseId: z.string().uuid(),
  titleHi: z.string().min(1),
  titleEn: z.string().min(1),
  descriptionHi: z.string().optional(),
  descriptionEn: z.string().optional(),
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(360),
  // Any YouTube URL/ID form staff paste — normalized server-side (see
  // assets.service.ts#toEmbeddableUrl) into the canonical embed URL.
  youtubeUrlOrId: z.string().min(1),
  // Display-only tag — see LiveClassView.batchId's own comment.
  batchId: z.string().uuid().optional(),
  // Record-keeping only — see LiveClassView.coHostUserId's own comment.
  coHostUserId: z.string().uuid().optional(),
  // Creation-time convenience only: loop-creates independent rows, one per
  // occurrence, each fully standalone afterward — not a recurring-series
  // model. See LiveClassesService#create's own comment for the occurrence cap.
  repeat: repeatSchema.optional(),
});
export type CreateLiveClassInput = z.infer<typeof createLiveClassSchema>;

export const updateLiveClassSchema = z.object({
  titleHi: z.string().min(1).optional(),
  titleEn: z.string().min(1).optional(),
  descriptionHi: z.string().optional(),
  descriptionEn: z.string().optional(),
  startsAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(5).max(360).optional(),
  youtubeUrlOrId: z.string().min(1).optional(),
  batchId: z.string().uuid().nullable().optional(),
  coHostUserId: z.string().uuid().nullable().optional(),
});
export type UpdateLiveClassInput = z.infer<typeof updateLiveClassSchema>;

export const publishLiveClassAsLessonSchema = z.object({
  // Not .uuid() — same convention as topicId used elsewhere in this app
  // (e.g. createLessonSchema's topicId path param): existence/ownership is
  // verified by the DB lookup in the service, not by the ID's string shape.
  topicId: z.string().min(1),
});
export type PublishLiveClassAsLessonInput = z.infer<typeof publishLiveClassAsLessonSchema>;

export interface LiveClassAttendanceRow {
  studentId: string;
  name: string;
  joinedAt: string;
  lastSeenAt: string;
  // Math.round((lastSeenAt - joinedAt) / 60000), computed server-side so
  // every reader (admin roster, future analytics) uses the same unit.
  durationMinutes: number;
}

export interface JoinLiveClassResponse {
  url: string;
  kind: 'EMBED';
}
