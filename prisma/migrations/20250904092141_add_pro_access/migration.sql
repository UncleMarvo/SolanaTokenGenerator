-- CreateTable
CREATE TABLE "public"."ProAccess" (
    "wallet" TEXT NOT NULL,
    "txSig" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProAccess_pkey" PRIMARY KEY ("wallet")
);

-- CreateIndex
CREATE INDEX "ProAccess_wallet_idx" ON "public"."ProAccess"("wallet");

-- CreateIndex
CREATE INDEX "ProAccess_expiresAt_idx" ON "public"."ProAccess"("expiresAt");
