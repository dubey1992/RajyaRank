-- The real idempotency key for BillingService.activateChargedSubscription —
-- see the doc comment there. Previously that method deduped purely on
-- subscription status, which silently dropped a genuinely second real
-- charge (e.g. an institute paying twice) instead of recording it.
-- AlterTable
ALTER TABLE "institution_invoices" ADD COLUMN "razorpay_payment_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "institution_invoices_razorpay_payment_id_key" ON "institution_invoices"("razorpay_payment_id");
