import { z } from 'zod';

export interface CourseRatingView {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourseRatingSummary {
  average: number;
  count: number;
  breakdown: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface CourseRatingsResponse {
  summary: CourseRatingSummary;
  ratings: CourseRatingView[];
}

export const submitRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});
export type SubmitRating = z.infer<typeof submitRatingSchema>;

/** Staff moderation queue row — includes fields a moderator needs that the
 *  public/student views never surface (report count, hidden ones too). */
export interface CourseRatingQueueItem extends CourseRatingView {
  courseId: string;
  courseTitleHi: string;
  courseTitleEn: string;
  status: 'VISIBLE' | 'HIDDEN';
  reportCount: number;
}

export const moderateRatingSchema = z.object({
  action: z.enum(['approve', 'hide']),
});
export type ModerateRating = z.infer<typeof moderateRatingSchema>;
