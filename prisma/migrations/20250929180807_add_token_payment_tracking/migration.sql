-- AlterTable
ALTER TABLE "public"."CreatedToken" ADD COLUMN     "paidAmount" DOUBLE PRECISION,
ADD COLUMN     "paymentTxSignature" TEXT,
ADD COLUMN     "paymentVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'free';

-- CreateIndex
CREATE INDEX "CreatedToken_tier_idx" ON "public"."CreatedToken"("tier");

-- CreateIndex
CREATE INDEX "CreatedToken_paymentTxSignature_idx" ON "public"."CreatedToken"("paymentTxSignature");

-- CreateIndex
CREATE INDEX "CreatedToken_paymentVerified_idx" ON "public"."CreatedToken"("paymentVerified");
