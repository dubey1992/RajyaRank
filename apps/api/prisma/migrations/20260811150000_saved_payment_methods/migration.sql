-- AlterTable
ALTER TABLE "users" ADD COLUMN "razorpay_customer_id" TEXT;

-- CreateTable
CREATE TABLE "saved_payment_methods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "razorpay_token_id" TEXT NOT NULL,
    "card_last4" TEXT NOT NULL,
    "card_network" TEXT NOT NULL,
    "card_type" TEXT NOT NULL,
    "card_issuer" TEXT,
    "expiry_month" INTEGER NOT NULL,
    "expiry_year" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "saved_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saved_payment_methods_razorpay_token_id_key" ON "saved_payment_methods"("razorpay_token_id");

-- CreateIndex
CREATE INDEX "saved_payment_methods_user_id_deleted_at_idx" ON "saved_payment_methods"("user_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "saved_payment_methods" ADD CONSTRAINT "saved_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
