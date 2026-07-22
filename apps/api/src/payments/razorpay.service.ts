import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';

/**
 * Razorpay provider. Order creation calls the Razorpay REST API when keys are
 * configured; signature/webhook verification is pure HMAC (no SDK). All
 * verification is FAIL-CLOSED: without a secret it returns false, so a payment
 * can never be accepted un-verified. We never mock payment success.
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger('Razorpay');

  constructor(@Inject(ENV) private readonly env: ApiEnv) {}

  get keyId(): string {
    return this.env.RAZORPAY_KEY_ID;
  }

  get configured(): boolean {
    return Boolean(this.env.RAZORPAY_KEY_ID && this.env.RAZORPAY_KEY_SECRET);
  }

  /** Create a Razorpay order. In dev (no keys) returns a clearly-marked dev id. */
  async createOrder(amountMinor: number, currency: string, receipt: string): Promise<string> {
    if (!this.configured) {
      this.logger.warn('Razorpay keys not set — returning a dev order id; live checkout is disabled.');
      return `order_dev_${receipt}`;
    }
    const data = await this.request<{ id: string }>('POST', '/orders', { amount: amountMinor, currency, receipt });
    return data.id;
  }

  // ── Subscriptions (institution → platform recurring billing) ──────────────

  /** Create (or re-create) a Razorpay Plan for one billing cycle of a
   *  SubscriptionPlan. Razorpay plans are period-specific, so monthly and
   *  annual cycles of the same logical plan are separate Razorpay plan
   *  objects, created on demand rather than cached — cheap and idempotent
   *  enough for this scale. Dev fallback mirrors createOrder. */
  async createSubscriptionPlan(input: { nameEn: string; amountMinor: number; cycle: 'MONTHLY' | 'ANNUAL' }): Promise<string> {
    if (!this.configured) {
      this.logger.warn('Razorpay keys not set — returning a dev plan id; no recurring billing will occur.');
      return `plan_dev_${input.nameEn.replace(/\s+/g, '_')}_${input.cycle}`;
    }
    const data = await this.request<{ id: string }>('POST', '/plans', {
      period: input.cycle === 'MONTHLY' ? 'monthly' : 'yearly',
      interval: 1,
      item: { name: input.nameEn, amount: input.amountMinor, currency: 'INR' },
    });
    return data.id;
  }

  /** Create a Razorpay Subscription against a plan id (see above). */
  async createSubscription(razorpayPlanId: string, totalCount: number): Promise<string> {
    if (!this.configured || razorpayPlanId.startsWith('plan_dev_')) {
      this.logger.warn('Razorpay Subscriptions not configured — returning a dev subscription id; the institution will not actually be charged.');
      return `sub_dev_${razorpayPlanId.replace(/^plan_dev_/, '')}`;
    }
    const data = await this.request<{ id: string }>('POST', '/subscriptions', {
      plan_id: razorpayPlanId,
      customer_notify: 1,
      total_count: totalCount,
    });
    return data.id;
  }

  async cancelSubscription(razorpaySubscriptionId: string): Promise<void> {
    if (!this.configured || razorpaySubscriptionId.startsWith('sub_dev_')) {
      this.logger.warn('Razorpay Subscriptions not configured — dev cancel is a no-op.');
      return;
    }
    await this.request('POST', `/subscriptions/${razorpaySubscriptionId}/cancel`, {});
  }

  // ── Route (marketplace settlement / institute payouts) ────────────────────

  /** Onboard an institute as a Razorpay Route linked account. Real onboarding
   *  needs full KYC (business docs, bank proof) submitted via the Razorpay
   *  dashboard/API — this creates the account shell; `kycStatus` on our side
   *  tracks whether Razorpay has since verified it (set via the admin KYC
   *  action once Razorpay confirms, not automated here). */
  async createLinkedAccount(input: { orgName: string; contactEmail: string; contactPhone: string }): Promise<string> {
    if (!this.configured) {
      this.logger.warn('Razorpay keys not set — returning a dev linked-account id; no real payouts will occur.');
      return `acc_dev_${input.orgName.replace(/\s+/g, '_')}`;
    }
    const data = await this.request<{ id: string }>('POST', '/accounts', {
      email: input.contactEmail,
      phone: input.contactPhone,
      legal_business_name: input.orgName,
      business_type: 'educational_institute',
      contact_name: input.orgName,
      profile: { category: 'education', subcategory: 'coaching_institute' },
    });
    return data.id;
  }

  /** Best-effort sync of a Head's self-service KYC submission onto the
   *  Razorpay linked account (PATCH /accounts/{id}) — legal name, PAN, GSTIN,
   *  registered address, and the settlement bank account. This covers the
   *  structured fields Razorpay's account API takes directly; the actual
   *  stakeholder KYC documents (PAN card scan, address/bank proof) are NOT
   *  forwarded here — Razorpay's stakeholder/document upload endpoints need a
   *  real sandbox to integrate against correctly (wrong field names fail
   *  silently against a live account), so that's left as a known gap: this
   *  app stores + lets Super Admin review those documents, who forwards them
   *  to Razorpay (dashboard or a follow-up integration pass) before the real
   *  KYC decision is made. Never throws — caller decides how to handle a
   *  sync failure (submission itself must never be blocked by it). */
  async updateLinkedAccountKyc(
    razorpayAccountId: string,
    input: {
      legalBusinessName: string;
      pan: string;
      gstin?: string;
      addressLine1: string;
      addressLine2?: string;
      addressCity: string;
      addressState: string;
      addressPincode: string;
      bankAccountNumber: string;
      bankIfsc: string;
      beneficiaryName: string;
    },
  ): Promise<{ synced: boolean; error?: string }> {
    if (!this.configured || razorpayAccountId.startsWith('acc_dev_')) {
      this.logger.warn('Razorpay Route not configured — KYC details saved locally only, not synced to Razorpay.');
      return { synced: false, error: 'not_configured' };
    }
    try {
      await this.request('PATCH', `/accounts/${razorpayAccountId}`, {
        legal_business_name: input.legalBusinessName,
        legal_info: { pan: input.pan, gst: input.gstin || undefined },
        profile: {
          addresses: {
            registered: {
              street1: input.addressLine1,
              street2: input.addressLine2 || undefined,
              city: input.addressCity,
              state: input.addressState,
              postal_code: input.addressPincode,
              country: 'IN',
            },
          },
        },
      });
      await this.request('POST', `/accounts/${razorpayAccountId}/products`, {
        product_name: 'route',
        tnc_accepted: true,
        settlements: {
          account_number: input.bankAccountNumber,
          ifsc_code: input.bankIfsc,
          beneficiary_name: input.beneficiaryName,
        },
      });
      return { synced: true };
    } catch (e) {
      this.logger.error(`Razorpay KYC sync failed for ${razorpayAccountId}: ${(e as Error).message}`);
      return { synced: false, error: (e as Error).message };
    }
  }

  /** Split a captured payment to an institute's linked account. */
  async createTransfer(razorpayPaymentId: string, razorpayAccountId: string, amountMinor: number): Promise<string> {
    if (!this.configured || razorpayAccountId.startsWith('acc_dev_')) {
      this.logger.warn('Razorpay Route not configured — returning a dev transfer id; no real payout will occur.');
      return `trf_dev_${razorpayPaymentId}_${amountMinor}`;
    }
    const data = await this.request<{ id: string }>('POST', `/payments/${razorpayPaymentId}/transfers`, {
      transfers: [{ account: razorpayAccountId, amount: amountMinor, currency: 'INR', on_hold: 0 }],
    });
    return data.id;
  }

  private async request<T>(method: string, path: string, body: Record<string, unknown>): Promise<T> {
    const auth = Buffer.from(`${this.env.RAZORPAY_KEY_ID}:${this.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: { 'content-type': 'application/json', authorization: `Basic ${auth}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Razorpay ${method} ${path} failed: ${res.status}`);
    return (await res.json()) as T;
  }

  /** HMAC of `${orderId}|${paymentId}` with key secret === signature. */
  verifyPaymentSignature(providerOrderId: string, paymentId: string, signature: string): boolean {
    if (!this.env.RAZORPAY_KEY_SECRET) return false;
    const expected = createHmac('sha256', this.env.RAZORPAY_KEY_SECRET)
      .update(`${providerOrderId}|${paymentId}`)
      .digest('hex');
    return safeEqual(expected, signature);
  }

  /** HMAC of the raw request body with the webhook secret === signature. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.env.RAZORPAY_WEBHOOK_SECRET) return false;
    const expected = createHmac('sha256', this.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
    return safeEqual(expected, signature);
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
