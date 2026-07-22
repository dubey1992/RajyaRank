import { z } from 'zod';

// ── Self-service KYC submission (Academic Head) ──────────────────────────────
export const kycDocTypeSchema = z.enum(['PAN_CARD', 'ADDRESS_PROOF', 'BANK_PROOF', 'GSTIN_CERTIFICATE', 'OTHER']);
export type KycDocType = z.infer<typeof kycDocTypeSchema>;

export const submitKycSchema = z.object({
  legalBusinessName: z.string().trim().min(2).max(160),
  pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN (e.g. ABCDE1234F)'),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, 'Enter a valid GSTIN')
    .optional()
    .or(z.literal('')),
  addressLine1: z.string().trim().min(2).max(200),
  addressLine2: z.string().trim().max(200).optional().or(z.literal('')),
  addressCity: z.string().trim().min(2).max(100),
  addressState: z.string().trim().min(2).max(100),
  addressPincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  bankAccountNumber: z.string().trim().regex(/^\d{6,20}$/, 'Enter a valid bank account number'),
  bankIfsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code'),
  beneficiaryName: z.string().trim().min(2).max(160),
  consent: z.boolean().refine((v) => v === true, { message: 'Please confirm the details above are accurate.' }),
});
export type SubmitKyc = z.infer<typeof submitKycSchema>;

export const kycDocumentUploadIntentSchema = z.object({
  docType: kycDocTypeSchema,
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, 'File must be 10 MB or smaller'),
});
export type KycDocumentUploadIntent = z.infer<typeof kycDocumentUploadIntentSchema>;

export interface KycDocumentUploadIntentResponse {
  documentId: string;
  storageKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

/** Confirms a document was actually PUT to storage before it's recorded —
 *  without this step, an abandoned/failed upload (network error, CORS,
 *  browser closed mid-upload) would still leave a document reference that
 *  looks "uploaded" but has no real object behind it. */
export const confirmKycDocumentUploadSchema = z.object({
  documentId: z.string().uuid(),
  storageKey: z.string().min(1),
  docType: kycDocTypeSchema,
  originalFilename: z.string().trim().min(1).max(200),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});
export type ConfirmKycDocumentUpload = z.infer<typeof confirmKycDocumentUploadSchema>;

export const rejectKycSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});
export type RejectKyc = z.infer<typeof rejectKycSchema>;

export interface KycDocumentView {
  id: string;
  docType: KycDocType;
  originalFilename: string;
  uploadedAt: string;
}

/** Masked — panMasked/bankAccountNumberMasked never carry the full value over the wire. */
export interface KycSubmissionView {
  legalBusinessName: string | null;
  panMasked: string | null;
  gstin: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPincode: string | null;
  bankAccountNumberMasked: string | null;
  bankIfsc: string | null;
  beneficiaryName: string | null;
  kycSubmittedAt: string | null;
  kycStatus: string;
  /** Set only when kycStatus is REJECTED — Super Admin's reason, shown to the
   *  Head so they know what to fix before resubmitting. */
  kycRejectionReason: string | null;
  documents: KycDocumentView[];
}

export interface LinkedAccountView {
  id: string;
  orgId: string;
  orgName: string;
  razorpayAccountId: string | null;
  kycStatus: string;
  payoutsEnabled: boolean;
  reserveHeldMinor: number;
}

export interface TransferView {
  id: string;
  orderId: string;
  productTitle: string;
  audience: string;
  grossMinor: number;
  gatewayFeeMinor: number;
  platformFeeMinor: number;
  reserveMinor: number;
  netMinor: number;
  status: string;
  createdAt: string;
}

/** Cross-institution rollup for the Super Admin settlements view. */
export interface SettlementSummaryView {
  grossMinor: number;
  institutionPayableMinor: number;
  platformRevenueMinor: number;
  reserveHeldMinor: number;
}

/** One institution's own payout statement, for the Academic Head view. */
export interface InstitutionEarningsView {
  internalGrossMinor: number;
  externalGrossMinor: number;
  internalFeeMinor: number;
  externalFeeMinor: number;
  gatewayFeeMinor: number;
  reserveHeldMinor: number;
  payableMinor: number;
  linkedAccount: LinkedAccountView | null;
  transfers: TransferView[];
}
