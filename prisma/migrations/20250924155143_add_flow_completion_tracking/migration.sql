-- CreateTable
CREATE TABLE "public"."FlowCompletion" (
    "id" TEXT NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "creatorWallet" TEXT NOT NULL,
    "honestLaunch" BOOLEAN NOT NULL DEFAULT false,
    "marketingKit" BOOLEAN NOT NULL DEFAULT false,
    "liquidity" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlowCompletion_tokenMint_idx" ON "public"."FlowCompletion"("tokenMint");

-- CreateIndex
CREATE INDEX "FlowCompletion_creatorWallet_idx" ON "public"."FlowCompletion"("creatorWallet");

-- CreateIndex
CREATE INDEX "FlowCompletion_completedAt_idx" ON "public"."FlowCompletion"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FlowCompletion_tokenMint_creatorWallet_key" ON "public"."FlowCompletion"("tokenMint", "creatorWallet");
