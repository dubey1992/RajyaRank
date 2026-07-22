import { z } from 'zod';

export const contactCategorySchema = z.enum([
  'GENERAL',
  'INSTITUTION_PARTNERSHIP',
  'STUDENT_SUPPORT',
  'PRESS',
  'OTHER',
]);
export type ContactCategory = z.infer<typeof contactCategorySchema>;

export const submitContactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  category: contactCategorySchema.default('GENERAL'),
  message: z.string().min(10).max(4000),
  // Honeypot — real visitors never see or fill this field. Deliberately NOT
  // constrained to empty here: a validation rejection would tell a bot the
  // trick exists. A non-empty value is instead silently no-op'd in the
  // service layer, well past validation.
  hp: z.string().max(500).optional(),
});
export type SubmitContact = z.infer<typeof submitContactSchema>;

export interface ContactMessageView {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  category: ContactCategory;
  message: string;
  status: 'NEW' | 'RESOLVED';
  createdAt: string;
  resolvedAt: string | null;
}
