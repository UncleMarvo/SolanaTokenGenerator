-- CreateTable
CREATE TABLE "public"."AdminSession" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminSession_wallet_idx" ON "public"."AdminSession"("wallet");

-- CreateIndex
CREATE INDEX "AdminSession_nonce_idx" ON "public"."AdminSession"("nonce");

-- CreateIndex
CREATE INDEX "AdminSession_createdAt_idx" ON "public"."AdminSession"("createdAt");
