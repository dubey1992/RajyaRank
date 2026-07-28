import { z } from 'zod';

export interface ConceptView {
  id: string;
  examId: string;
  parentConceptId: string | null;
  code: string;
  nameHi: string;
  nameEn: string;
  syllabusVersion: string | null;
  sequence: number;
  lessonCount: number;
  questionCount: number;
}

export const upsertConceptSchema = z.object({
  examId: z.string().uuid(),
  parentConceptId: z.string().uuid().optional(),
  code: z.string().min(1).max(60),
  nameHi: z.string().min(1).max(200),
  nameEn: z.string().min(1).max(200),
  syllabusVersion: z.string().max(60).optional(),
  sequence: z.number().int().min(0).default(0),
});
export type UpsertConcept = z.infer<typeof upsertConceptSchema>;

/** Readiness score breakdown — the five weighted dimensions shown verbatim in
 *  the student-facing explainer modal, each 0-100. */
export interface ReadinessBreakdown {
  conceptMastery: number;
  syllabusCoverage: number;
  revisionRetention: number;
  testEfficiency: number;
  consistency: number;
}

export type ReadinessView =
  | { available: true; score: number; breakdown: ReadinessBreakdown }
  | { available: false; reason: 'ONBOARDING_INCOMPLETE' | 'NO_CONCEPTS_AUTHORED' };

export interface ConceptLessonLink {
  lessonId: string;
  titleHi: string;
  titleEn: string;
}

export interface ConceptQuestionLink {
  questionId: string;
  textHi: string | null;
  textEn: string | null;
}
