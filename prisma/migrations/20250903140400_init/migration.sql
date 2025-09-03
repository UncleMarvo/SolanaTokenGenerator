-- CreateTable
CREATE TABLE "public"."PositionsClmm" (
    "positionMint" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "tokenA" TEXT NOT NULL,
    "tokenB" TEXT NOT NULL,
    "decA" INTEGER NOT NULL,
    "decB" INTEGER NOT NULL,
    "tickLower" INTEGER NOT NULL,
    "tickUpper" INTEGER NOT NULL,
    "lastLiquidity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionsClmm_pkey" PRIMARY KEY ("positionMint")
);

-- CreateTable
CREATE TABLE "public"."TxEvent" (
    "txSig" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "positionMint" TEXT,
    "poolId" TEXT,
    "action" TEXT NOT NULL,
    "amountA" TEXT,
    "amountB" TEXT,
    "liquidityDelta" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TxEvent_pkey" PRIMARY KEY ("txSig")
);

-- CreateIndex
CREATE INDEX "TxEvent_wallet_idx" ON "public"."TxEvent"("wallet");

-- CreateIndex
CREATE INDEX "TxEvent_mint_idx" ON "public"."TxEvent"("mint");
