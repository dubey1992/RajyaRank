import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Principal } from '@rajyarank/auth';
import type { ConfirmKycDocumentUpload, KycDocumentUploadIntent, KycSubmissionView, SubmitKyc } from '@rajyarank/contracts';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RazorpayService } from '../payments/razorpay.service';
import { S3Service } from '../s3/s3.service';
import { encryptField, decryptField } from '../common/crypto.util';
import { AppError } from '../common/errors/app-error';

// Fixed platform-wide rates matching the profit-model prototype's calculator
// defaults. The platform's own commission is the only variable rate (per the
// org's subscription plan, by audience) — these two are flat operating costs.
const GATEWAY_RATE = 0.02;
const RESERVE_RATE = 0.02;

function maskPan(pan: string): string {
  return pan.length >= 6 ? `${pan.slice(0, 2)}${'*'.repeat(pan.length - 4)}${pan.slice(-2)}` : '****';
}

function maskBankAccount(acct: string): string {
  return acct.length > 4 ? `${'*'.repeat(acct.length - 4)}${acct.slice(-4)}` : '****';
}

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger('Settlements');

  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly razorpay: RazorpayService,
    private readonly s3: S3Service,
  ) {}

  /** Called from payments.service.ts's markPaid() right after a student's
   *  order is confirmed. Splits the sale between platform and institute and
   *  records a Transfer — never blocks or rolls back the payment/entitlement
   *  it's called after; failures here are logged for manual reconciliation. */
  async createTransferForOrder(orderId: string, providerPaymentId?: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { product: { include: { course: true } } },
      });
      if (!order || !order.product.course?.orgId) return; // platform-owned course — nothing to split
      const orgId = order.product.course.orgId;

      const linkedAccount = await this.prisma.instituteLinkedAccount.findUnique({ where: { orgId } });
      if (!linkedAccount || !linkedAccount.payoutsEnabled) return; // institute not onboarded for payouts yet

      const subscription = await this.prisma.organizationSubscription.findUnique({ where: { orgId }, include: { plan: true } });
      if (!subscription || subscription.status !== 'ACTIVE') {
        this.logger.warn(`Order ${orderId}: institute has no active subscription plan — skipping settlement split.`);
        return;
      }

      const existing = await this.prisma.transfer.findUnique({ where: { orderId } });
      if (existing) return; // idempotent — already split (e.g. webhook + verify both fired)

      const feeBps = order.product.audience === 'INSTITUTE' ? subscription.plan.internalFeeBps : subscription.plan.externalFeeBps;
      const gross = order.amountMinor;
      const gatewayFeeMinor = Math.round(gross * GATEWAY_RATE);
      const reserveMinor = Math.round(gross * RESERVE_RATE);
      const net = gross - gatewayFeeMinor - reserveMinor;
      const platformFeeMinor = Math.round((net * feeBps) / 10000);
      const netMinor = net - platformFeeMinor;

      const razorpayTransferId = providerPaymentId
        ? await this.razorpay.createTransfer(providerPaymentId, linkedAccount.razorpayAccountId ?? '', netMinor)
        : null;

      await this.prisma.$transaction([
        this.prisma.transfer.create({
          data: {
            orderId,
            linkedAccountId: linkedAccount.id,
            grossMinor: gross,
            gatewayFeeMinor,
            platformFeeMinor,
            reserveMinor,
            netMinor,
            razorpayTransferId,
            status: 'PROCESSED',
          },
        }),
        this.prisma.instituteLinkedAccount.update({ where: { id: linkedAccount.id }, data: { reserveHeldMinor: { increment: reserveMinor } } }),
      ]);
    } catch (e) {
      this.logger.error(`Settlement split failed for order ${orderId}: ${(e as Error).message}`);
    }
  }

  /** Whether an order's sale has already been settled to the institute —
   *  refunding it needs the transfer reversed, and always escalates to
   *  Super Admin (an Academic Head can't unwind money already paid out). */
  async hasProcessedTransfer(orderId: string): Promise<boolean> {
    const transfer = await this.prisma.transfer.findUnique({ where: { orderId } });
    return transfer?.status === 'PROCESSED';
  }

  /** Reverses a settled transfer as part of processing a refund. Real bank
   *  clawback (or netting against the institute's next payout) is a Razorpay
   *  Route operation outside this app's code — this records the reversal on
   *  our side and releases the reserve that had been held for it. */
  async reverseTransferForOrder(orderId: string) {
    const transfer = await this.prisma.transfer.findUnique({ where: { orderId } });
    if (!transfer || transfer.status !== 'PROCESSED') return;
    await this.prisma.$transaction([
      this.prisma.transfer.update({ where: { id: transfer.id }, data: { status: 'REVERSED' } }),
      this.prisma.instituteLinkedAccount.update({ where: { id: transfer.linkedAccountId }, data: { reserveHeldMinor: { decrement: transfer.reserveMinor } } }),
    ]);
  }

  // ── Super Admin: cross-institution views ──
  async listLinkedAccounts() {
    const rows = await this.prisma.instituteLinkedAccount.findMany({ include: { organization: { select: { name: true } } } });
    return rows.map((a) => ({
      id: a.id,
      orgId: a.orgId,
      orgName: a.organization.name,
      razorpayAccountId: a.razorpayAccountId,
      kycStatus: a.kycStatus,
      payoutsEnabled: a.payoutsEnabled,
      reserveHeldMinor: a.reserveHeldMinor,
    }));
  }

  /** Finds the institute's linked account, creating the Razorpay account
   *  shell on first use — shared by the Super Admin manual-verify path and
   *  the Head's self-service KYC submission below. */
  private async findOrCreateLinkedAccount(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, include: { head: true } });
    if (!org) throw AppError.notFound('Institution not found.');

    let linkedAccount = await this.prisma.instituteLinkedAccount.findUnique({ where: { orgId } });
    if (!linkedAccount) {
      const razorpayAccountId = await this.razorpay.createLinkedAccount({
        orgName: org.name,
        contactEmail: org.head?.email ?? 'finance@rajyarank.dev',
        contactPhone: org.head?.phone ?? '9999999999',
      });
      linkedAccount = await this.prisma.instituteLinkedAccount.create({ data: { orgId, razorpayAccountId } });
    }
    return { org, linkedAccount };
  }

  /** Marks an institute's already-submitted KYC packet verified, enabling
   *  payouts. Super Admin only — a real business/compliance review step, so
   *  this requires a linked account with an actual submitted packet
   *  (legalBusinessName/PAN/bank/etc via the Head's self-service submitKyc());
   *  it no longer fabricates a linked account or rubber-stamps one with no
   *  real data behind it. */
  async verifyKyc(actor: Principal, orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw AppError.notFound('Institution not found.');
    const existing = await this.prisma.instituteLinkedAccount.findUnique({ where: { orgId } });
    if (!existing || !existing.kycSubmittedAt) {
      throw AppError.conflict('This institution has not submitted a KYC packet yet — nothing to verify.');
    }
    const linkedAccount = await this.prisma.instituteLinkedAccount.update({
      where: { id: existing.id },
      data: { kycStatus: 'VERIFIED', payoutsEnabled: true },
    });
    await this.audit.record({ actorUserId: actor.userId, action: 'settlements.kyc_verified', targetType: 'Organization', targetId: orgId, result: 'SUCCESS' });
    return {
      id: linkedAccount.id,
      orgId: linkedAccount.orgId,
      orgName: org.name,
      razorpayAccountId: linkedAccount.razorpayAccountId,
      kycStatus: linkedAccount.kycStatus,
      payoutsEnabled: linkedAccount.payoutsEnabled,
      reserveHeldMinor: linkedAccount.reserveHeldMinor,
    };
  }

  /** Rejects an already-submitted KYC packet with a reason the Head sees on
   *  their Earnings page — the counterpart to verifyKyc() above. Also
   *  requires a real submission (same reasoning as verifyKyc): there's
   *  nothing to reject if the Head never submitted anything. */
  async rejectKyc(actor: Principal, orgId: string, reason: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw AppError.notFound('Institution not found.');
    const existing = await this.prisma.instituteLinkedAccount.findUnique({ where: { orgId } });
    if (!existing || !existing.kycSubmittedAt) {
      throw AppError.conflict('This institution has not submitted a KYC packet yet — nothing to reject.');
    }
    const linkedAccount = await this.prisma.instituteLinkedAccount.update({
      where: { id: existing.id },
      data: { kycStatus: 'REJECTED', payoutsEnabled: false, kycRejectionReason: reason },
    });
    await this.audit.record({ actorUserId: actor.userId, action: 'settlements.kyc_rejected', targetType: 'Organization', targetId: orgId, result: 'SUCCESS', after: { reason } });
    return {
      id: linkedAccount.id,
      orgId: linkedAccount.orgId,
      orgName: org.name,
      razorpayAccountId: linkedAccount.razorpayAccountId,
      kycStatus: linkedAccount.kycStatus,
      payoutsEnabled: linkedAccount.payoutsEnabled,
      reserveHeldMinor: linkedAccount.reserveHeldMinor,
    };
  }

  // Razorpay Route's linked-account (KYC) webhook lifecycle. Called from the
  // shared /webhooks/razorpay handler for account.* events — real, automatic
  // KYC sync instead of relying solely on Super Admin's manual "Verify KYC"
  // click above (which remains as a fallback/override).
  private static readonly ACCOUNT_EVENT_STATUS: Record<string, { kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'; payoutsEnabled: boolean }> = {
    'account.activated': { kycStatus: 'VERIFIED', payoutsEnabled: true },
    'account.under_review': { kycStatus: 'PENDING', payoutsEnabled: false },
    'account.activated_kyc_pending': { kycStatus: 'PENDING', payoutsEnabled: false },
    'account.needs_clarification': { kycStatus: 'PENDING', payoutsEnabled: false },
    'account.rejected': { kycStatus: 'REJECTED', payoutsEnabled: false },
    'account.suspended': { kycStatus: 'REJECTED', payoutsEnabled: false },
  };

  async handleAccountEvent(eventType: string, payload: { account?: { entity?: { id?: string } } }) {
    const mapped = SettlementsService.ACCOUNT_EVENT_STATUS[eventType];
    if (!mapped) {
      this.logger.warn(`Unhandled Razorpay account event: ${eventType}`);
      return;
    }
    const razorpayAccountId = payload.account?.entity?.id;
    if (!razorpayAccountId) return;

    const linkedAccount = await this.prisma.instituteLinkedAccount.findUnique({ where: { razorpayAccountId } });
    if (!linkedAccount) {
      this.logger.warn(`Razorpay account event for unknown linked account: ${razorpayAccountId}`);
      return;
    }
    if (linkedAccount.kycStatus === mapped.kycStatus && linkedAccount.payoutsEnabled === mapped.payoutsEnabled) return;

    await this.prisma.instituteLinkedAccount.update({ where: { id: linkedAccount.id }, data: mapped });
    await this.audit.record({
      action: 'settlements.kyc_webhook',
      targetType: 'Organization',
      targetId: linkedAccount.orgId,
      result: 'SUCCESS',
      after: { eventType, ...mapped },
    });
  }

  async superSummary() {
    const transfers = await this.prisma.transfer.findMany();
    const grossMinor = transfers.reduce((sum, t) => sum + t.grossMinor, 0);
    const institutionPayableMinor = transfers.reduce((sum, t) => sum + t.netMinor, 0);
    const platformRevenueMinor = transfers.reduce((sum, t) => sum + t.platformFeeMinor, 0);
    const reserveHeldMinor = (await this.prisma.instituteLinkedAccount.aggregate({ _sum: { reserveHeldMinor: true } }))._sum.reserveHeldMinor ?? 0;
    return { grossMinor, institutionPayableMinor, platformRevenueMinor, reserveHeldMinor };
  }

  async listTransfers(orgId?: string) {
    const rows = await this.prisma.transfer.findMany({
      where: orgId ? { linkedAccount: { orgId } } : {},
      include: { order: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((t) => ({
      id: t.id,
      orderId: t.orderId,
      productTitle: t.order.product.titleEn,
      audience: t.order.product.audience,
      grossMinor: t.grossMinor,
      gatewayFeeMinor: t.gatewayFeeMinor,
      platformFeeMinor: t.platformFeeMinor,
      reserveMinor: t.reserveMinor,
      netMinor: t.netMinor,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  // ── Academic Head: their own institution only ──
  async institutionEarnings(principal: Principal) {
    if (!principal.orgId) throw AppError.permissionDenied('No institution assigned.');
    const orgId = principal.orgId;

    const [linkedAccountRaw, transfers] = await Promise.all([
      this.prisma.instituteLinkedAccount.findUnique({ where: { orgId }, include: { organization: { select: { name: true } } } }),
      this.listTransfers(orgId),
    ]);

    const internal = transfers.filter((t) => t.audience === 'INSTITUTE');
    const external = transfers.filter((t) => t.audience === 'PUBLIC');
    const sum = (rows: typeof transfers, key: 'grossMinor' | 'platformFeeMinor' | 'gatewayFeeMinor' | 'reserveMinor') => rows.reduce((s, t) => s + t[key], 0);

    const linkedAccount = linkedAccountRaw
      ? {
          id: linkedAccountRaw.id,
          orgId: linkedAccountRaw.orgId,
          orgName: linkedAccountRaw.organization.name,
          razorpayAccountId: linkedAccountRaw.razorpayAccountId,
          kycStatus: linkedAccountRaw.kycStatus,
          payoutsEnabled: linkedAccountRaw.payoutsEnabled,
          reserveHeldMinor: linkedAccountRaw.reserveHeldMinor,
        }
      : null;

    return {
      internalGrossMinor: sum(internal, 'grossMinor'),
      externalGrossMinor: sum(external, 'grossMinor'),
      internalFeeMinor: sum(internal, 'platformFeeMinor'),
      externalFeeMinor: sum(external, 'platformFeeMinor'),
      gatewayFeeMinor: sum(transfers, 'gatewayFeeMinor'),
      reserveHeldMinor: linkedAccount?.reserveHeldMinor ?? 0,
      payableMinor: transfers.reduce((s, t) => s + t.netMinor, 0),
      linkedAccount,
      transfers,
    };
  }

  private toKycSubmissionView(
    linkedAccount: {
      legalBusinessName: string | null;
      panEnc: string | null;
      gstin: string | null;
      addressLine1: string | null;
      addressLine2: string | null;
      addressCity: string | null;
      addressState: string | null;
      addressPincode: string | null;
      bankAccountNumberEnc: string | null;
      bankIfsc: string | null;
      beneficiaryName: string | null;
      kycSubmittedAt: Date | null;
      kycStatus: string;
      kycRejectionReason: string | null;
    },
    documents: { id: string; docType: string; originalFilename: string; uploadedAt: Date }[],
  ): KycSubmissionView {
    return {
      legalBusinessName: linkedAccount.legalBusinessName,
      panMasked: linkedAccount.panEnc ? maskPan(decryptField(linkedAccount.panEnc, this.env.FIELD_ENCRYPTION_KEY)) : null,
      gstin: linkedAccount.gstin,
      addressLine1: linkedAccount.addressLine1,
      addressLine2: linkedAccount.addressLine2,
      addressCity: linkedAccount.addressCity,
      addressState: linkedAccount.addressState,
      addressPincode: linkedAccount.addressPincode,
      bankAccountNumberMasked: linkedAccount.bankAccountNumberEnc
        ? maskBankAccount(decryptField(linkedAccount.bankAccountNumberEnc, this.env.FIELD_ENCRYPTION_KEY))
        : null,
      bankIfsc: linkedAccount.bankIfsc,
      beneficiaryName: linkedAccount.beneficiaryName,
      kycSubmittedAt: linkedAccount.kycSubmittedAt ? linkedAccount.kycSubmittedAt.toISOString() : null,
      kycStatus: linkedAccount.kycStatus,
      kycRejectionReason: linkedAccount.kycRejectionReason,
      documents: documents.map((d) => ({
        id: d.id,
        docType: d.docType as KycSubmissionView['documents'][number]['docType'],
        originalFilename: d.originalFilename,
        uploadedAt: d.uploadedAt.toISOString(),
      })),
    };
  }

  // ── Academic Head: self-service KYC submission ──
  async getMyKycSubmission(principal: Principal): Promise<KycSubmissionView | null> {
    if (!principal.orgId) throw AppError.permissionDenied('No institution assigned.');
    const linkedAccount = await this.prisma.instituteLinkedAccount.findUnique({
      where: { orgId: principal.orgId },
      include: { kycDocuments: { orderBy: { uploadedAt: 'desc' } } },
    });
    if (!linkedAccount) return null;
    return this.toKycSubmissionView(linkedAccount, linkedAccount.kycDocuments);
  }

  /** The Head's self-service submission — collects the same structured fields
   *  Super Admin's manual "Verify KYC" used to require out-of-band, encrypts
   *  PAN/bank account at rest, and best-effort syncs them to Razorpay. Does
   *  NOT itself verify — Razorpay's real review (via the account.* webhook)
   *  or Super Admin's manual verify/reject still gates that; this only
   *  records that the Head has done their part. The one exception: a
   *  resubmission after a rejection clears kycStatus back to PENDING and
   *  drops the old rejection reason, since the corrected packet supersedes
   *  it and Super Admin should review it fresh, not under a stale REJECTED
   *  badge. Never downgrades an already-VERIFIED org — the UI hides this
   *  form once payouts are enabled, so that path isn't reachable normally. */
  async submitKyc(principal: Principal, dto: SubmitKyc): Promise<KycSubmissionView> {
    if (!principal.orgId) throw AppError.permissionDenied('No institution assigned.');
    const { linkedAccount } = await this.findOrCreateLinkedAccount(principal.orgId);

    const panEnc = encryptField(dto.pan, this.env.FIELD_ENCRYPTION_KEY);
    const bankAccountNumberEnc = encryptField(dto.bankAccountNumber, this.env.FIELD_ENCRYPTION_KEY);

    const updated = await this.prisma.instituteLinkedAccount.update({
      where: { id: linkedAccount.id },
      data: {
        legalBusinessName: dto.legalBusinessName,
        panEnc,
        gstin: dto.gstin || null,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 || null,
        addressCity: dto.addressCity,
        addressState: dto.addressState,
        addressPincode: dto.addressPincode,
        bankAccountNumberEnc,
        bankIfsc: dto.bankIfsc,
        beneficiaryName: dto.beneficiaryName,
        kycSubmittedAt: new Date(),
        kycSubmittedBy: principal.userId,
        ...(linkedAccount.kycStatus === 'REJECTED' ? { kycStatus: 'PENDING' as const, kycRejectionReason: null } : {}),
      },
      include: { kycDocuments: { orderBy: { uploadedAt: 'desc' } } },
    });

    const sync = updated.razorpayAccountId
      ? await this.razorpay.updateLinkedAccountKyc(updated.razorpayAccountId, {
          legalBusinessName: dto.legalBusinessName,
          pan: dto.pan,
          gstin: dto.gstin || undefined,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2 || undefined,
          addressCity: dto.addressCity,
          addressState: dto.addressState,
          addressPincode: dto.addressPincode,
          bankAccountNumber: dto.bankAccountNumber,
          bankIfsc: dto.bankIfsc,
          beneficiaryName: dto.beneficiaryName,
        })
      : { synced: false, error: 'no_linked_account' };

    await this.audit.record({
      actorUserId: principal.userId,
      action: 'settlements.kyc_submitted',
      targetType: 'Organization',
      targetId: principal.orgId,
      result: 'SUCCESS',
      after: { legalBusinessName: dto.legalBusinessName, panLast4: dto.pan.slice(-4), razorpaySynced: sync.synced },
    });

    return this.toKycSubmissionView(updated, updated.kycDocuments);
  }

  /** No DB row yet — just mints a storage key + presigned PUT. The row is only
   *  created once confirmKycDocumentUpload() below proves the PUT succeeded,
   *  so an abandoned upload never shows up as if it were "uploaded". */
  async createKycDocumentUploadIntent(principal: Principal, dto: KycDocumentUploadIntent) {
    if (!principal.orgId) throw AppError.permissionDenied('No institution assigned.');
    const { linkedAccount } = await this.findOrCreateLinkedAccount(principal.orgId);

    const safeName = dto.fileName.replace(/[^\w.-]+/g, '_').slice(0, 120);
    const documentId = randomUUID();
    const storageKey = `kyc/${linkedAccount.id}/${documentId}/${safeName}`;
    const uploadUrl = await this.s3.presignPut(storageKey, dto.mimeType, 900);
    return { documentId, storageKey, uploadUrl, expiresInSeconds: 900 };
  }

  /** Records the document only after the client's PUT actually succeeded.
   *  Replaces (not accumulates) any prior document of the same type — a
   *  re-upload is meant to supersede the old one, not sit alongside it. */
  async confirmKycDocumentUpload(principal: Principal, dto: ConfirmKycDocumentUpload) {
    if (!principal.orgId) throw AppError.permissionDenied('No institution assigned.');
    const { linkedAccount } = await this.findOrCreateLinkedAccount(principal.orgId);

    await this.prisma.instituteKycDocument.deleteMany({ where: { linkedAccountId: linkedAccount.id, docType: dto.docType } });
    const document = await this.prisma.instituteKycDocument.create({
      data: {
        id: dto.documentId,
        linkedAccountId: linkedAccount.id,
        docType: dto.docType,
        storageKey: dto.storageKey,
        originalFilename: dto.originalFilename,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        uploadedBy: principal.userId,
      },
    });
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'settlements.kyc_document_uploaded',
      targetType: 'InstituteKycDocument',
      targetId: document.id,
      result: 'SUCCESS',
      after: { docType: dto.docType },
    });
    return { id: document.id };
  }

  // ── Super Admin: review a submitted KYC packet ──
  async getKycSubmissionForOrg(orgId: string): Promise<KycSubmissionView | null> {
    const linkedAccount = await this.prisma.instituteLinkedAccount.findUnique({
      where: { orgId },
      include: { kycDocuments: { orderBy: { uploadedAt: 'desc' } } },
    });
    if (!linkedAccount) return null;
    return this.toKycSubmissionView(linkedAccount, linkedAccount.kycDocuments);
  }

  /** Short-lived signed URL to view/download one submitted document. */
  async getKycDocumentDownloadUrl(documentId: string): Promise<string> {
    const doc = await this.prisma.instituteKycDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw AppError.notFound('Document not found.');
    return this.s3.presignGet(doc.storageKey, 300);
  }
}
