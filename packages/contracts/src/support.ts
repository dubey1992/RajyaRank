import { z } from 'zod';

// ── Doubts ────────────────────────────────────────────────────────────────
export const createDoubtSchema = z
  .object({
    subjectId: z.string().uuid().optional(),
    lessonId: z.string().uuid().optional(),
    questionVersionId: z.string().uuid().optional(),
    testVersionId: z.string().uuid().optional(),
    bodyText: z.string().min(3).max(4000),
    imageAssetId: z.string().uuid().optional(),
  })
  .refine((d) => d.bodyText.trim().length > 0, { message: 'Describe your doubt' });
export type CreateDoubt = z.infer<typeof createDoubtSchema>;

export const doubtReplySchema = z.object({
  bodyText: z.string().min(1).max(4000),
  imageAssetId: z.string().uuid().optional(),
  videoAssetId: z.string().uuid().optional(),
  lessonRefId: z.string().uuid().optional(),
});
export type DoubtReplyInput = z.infer<typeof doubtReplySchema>;

export const assignDoubtSchema = z.object({ assignedToUserId: z.string().uuid() });

export const doubtStatusSchema = z.enum(['OPEN', 'ASSIGNED', 'ANSWERED', 'RESOLVED', 'REOPENED', 'CLOSED']);

export interface DoubtView {
  id: string;
  bodyText: string;
  status: string;
  subjectId: string | null;
  lessonId: string | null;
  assignedToUserId: string | null;
  createdAt: string;
  replies: { id: string; authorUserId: string; bodyText: string; createdAt: string }[];
}

// ── Support tickets ──────────────────────────────────────────────────────────
export const ticketCategorySchema = z.enum([
  'LOGIN_OTP',
  'PAYMENT',
  'ACCESS_ENTITLEMENT',
  'VIDEO_PDF',
  'TEST',
  'CONTENT_CORRECTION',
  'REFUND',
  'ACCOUNT',
  'OTHER',
]);

export const createTicketSchema = z.object({
  category: ticketCategorySchema,
  subject: z.string().min(3).max(160),
  bodyText: z.string().min(3).max(4000),
});
export type CreateTicket = z.infer<typeof createTicketSchema>;

export const ticketReplySchema = z.object({
  bodyText: z.string().min(1).max(4000),
  internal: z.boolean().optional(),
});

export const ticketStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_STUDENT', 'RESOLVED', 'CLOSED']),
});

export interface TicketView {
  id: string;
  category: string;
  subject: string;
  status: string;
  createdAt: string;
  replies: { id: string; authorUserId: string; bodyText: string; internal: boolean; createdAt: string }[];
}

// ── Notifications ────────────────────────────────────────────────────────────
export interface NotificationView {
  id: string;
  category: string;
  titleHi: string;
  titleEn: string;
  bodyHi: string | null;
  bodyEn: string | null;
  read: boolean;
  createdAt: string;
}

export const notificationPreferenceSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  mutedCategories: z.array(z.string()).default([]),
});
export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;
