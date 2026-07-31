import { z } from 'zod';

export const submitDemoRequestSchema = z.object({
  institutionName: z.string().min(1).max(160),
  contactName: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().min(6).max(20),
  role: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  studentCount: z.coerce.number().int().positive().max(1_000_000).optional(),
  message: z.string().max(4000).optional(),
  // Honeypot — see submitContactSchema's identical field for why this is
  // deliberately unconstrained here rather than rejected at validation time.
  hp: z.string().max(500).optional(),
});
export type SubmitDemoRequest = z.infer<typeof submitDemoRequestSchema>;

export interface DemoRequestView {
  id: string;
  institutionName: string;
  contactName: string;
  email: string;
  phone: string;
  role: string | null;
  city: string | null;
  studentCount: number | null;
  message: string | null;
  status: 'NEW' | 'RESOLVED';
  createdAt: string;
  resolvedAt: string | null;
}
