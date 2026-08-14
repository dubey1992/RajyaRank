-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "linked_account_id" TEXT NOT NULL,
    "razorpay_settlement_id" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "fees_minor" INTEGER NOT NULL,
    "tax_minor" INTEGER NOT NULL,
    "utr" TEXT,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PROCESSED',
    "settled_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settlements_razorpay_settlement_id_key" ON "settlements"("razorpay_settlement_id");

-- CreateIndex
CREATE INDEX "settlements_linked_account_id_settled_at_idx" ON "settlements"("linked_account_id", "settled_at");

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_linked_account_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "institute_linked_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
