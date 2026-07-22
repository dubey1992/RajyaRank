import { z } from 'zod';

export interface TestimonialView {
  id: string;
  quoteHi: string;
  quoteEn: string;
  studentName: string;
  initials: string;
  examLabel: string;
  sequence: number;
  published: boolean;
}

export const upsertTestimonialSchema = z.object({
  quoteHi: z.string().min(1).max(2000),
  quoteEn: z.string().min(1).max(2000),
  studentName: z.string().min(1).max(120),
  initials: z.string().min(1).max(4),
  examLabel: z.string().min(1).max(80),
  sequence: z.number().int().min(0).default(0),
  published: z.boolean().default(true),
});
export type UpsertTestimonial = z.infer<typeof upsertTestimonialSchema>;

export interface FaqView {
  id: string;
  questionHi: string;
  questionEn: string;
  answerHi: string;
  answerEn: string;
  sequence: number;
  published: boolean;
}

export const upsertFaqSchema = z.object({
  questionHi: z.string().min(1).max(400),
  questionEn: z.string().min(1).max(400),
  answerHi: z.string().min(1).max(2000),
  answerEn: z.string().min(1).max(2000),
  sequence: z.number().int().min(0).default(0),
  published: z.boolean().default(true),
});
export type UpsertFaq = z.infer<typeof upsertFaqSchema>;

export const studyContentKindSchema = z.enum(['VIDEO', 'PDF', 'TEST', 'PACK']);
export type StudyContentKindValue = z.infer<typeof studyContentKindSchema>;

export interface StudyContentTeaserView {
  id: string;
  kind: StudyContentKindValue;
  titleHi: string;
  titleEn: string;
  descHi: string;
  descEn: string;
  sequence: number;
  published: boolean;
}

export const upsertStudyContentTeaserSchema = z.object({
  kind: studyContentKindSchema,
  titleHi: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  descHi: z.string().min(1).max(500),
  descEn: z.string().min(1).max(500),
  sequence: z.number().int().min(0).default(0),
  published: z.boolean().default(true),
});
export type UpsertStudyContentTeaser = z.infer<typeof upsertStudyContentTeaserSchema>;
