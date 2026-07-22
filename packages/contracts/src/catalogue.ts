import { z } from 'zod';

export const stateSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  nameEn: z.string(),
  nameHi: z.string(),
});
export type State = z.infer<typeof stateSchema>;

export const examSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  nameEn: z.string(),
  nameHi: z.string(),
  examBodyId: z.string().uuid(),
  stateId: z.string().uuid().nullable(),
});
export type Exam = z.infer<typeof examSchema>;

export interface ExamBody {
  id: string;
  code: string;
  nameEn: string;
  nameHi: string;
}

/** Public "partner institutes" directory row — no PII, just what they sell. */
export interface PartnerInstituteView {
  id: string;
  name: string;
  publicCount: number;
  instituteCount: number;
}

export const verifyInstituteCodeSchema = z.object({
  code: z.string().min(2).max(40),
});
export type VerifyInstituteCode = z.infer<typeof verifyInstituteCodeSchema>;

export interface VerifyInstituteCodeResponse {
  valid: boolean;
  orgName?: string;
  product?: import('./payment').ProductView;
}

const code = z.string().min(2).max(40).regex(/^[A-Z0-9_]+$/, 'Uppercase letters, digits, underscores');

export const createStateSchema = z.object({ code, nameEn: z.string().min(1).max(120), nameHi: z.string().min(1).max(120) });
export type CreateState = z.infer<typeof createStateSchema>;

export const createExamBodySchema = z.object({ code, nameEn: z.string().min(1).max(160), nameHi: z.string().min(1).max(160) });
export type CreateExamBody = z.infer<typeof createExamBodySchema>;

export const createExamSchema = z.object({
  code,
  nameEn: z.string().min(1).max(160),
  nameHi: z.string().min(1).max(160),
  examBodyId: z.string().uuid(),
  stateId: z.string().uuid().optional(),
});
export type CreateExam = z.infer<typeof createExamSchema>;
