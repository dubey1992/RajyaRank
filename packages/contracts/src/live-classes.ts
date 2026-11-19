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
}

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
}

export interface JoinLiveClassResponse {
  url: string;
  kind: 'EMBED';
}
