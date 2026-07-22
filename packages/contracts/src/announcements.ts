import { z } from 'zod';

export const announcementAudienceSchema = z.enum(['ALL', 'STUDENTS', 'STAFF']);
export type AnnouncementAudience = z.infer<typeof announcementAudienceSchema>;

export const createAnnouncementSchema = z.object({
  titleHi: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  bodyHi: z.string().min(1).max(4000),
  bodyEn: z.string().min(1).max(4000),
  audience: announcementAudienceSchema.default('ALL'),
});
export type CreateAnnouncement = z.infer<typeof createAnnouncementSchema>;

export interface AnnouncementView {
  id: string;
  titleHi: string;
  titleEn: string;
  bodyHi: string;
  bodyEn: string;
  audience: AnnouncementAudience;
  recipientCount: number;
  createdAt: string;
}
