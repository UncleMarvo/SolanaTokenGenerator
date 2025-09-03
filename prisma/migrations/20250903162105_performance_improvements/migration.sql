-- CreateIndex
CREATE INDEX "PositionsClmm_wallet_idx" ON "public"."PositionsClmm"("wallet");

-- CreateIndex
CREATE INDEX "PositionsClmm_tokenA_idx" ON "public"."PositionsClmm"("tokenA");

-- CreateIndex
CREATE INDEX "PositionsClmm_tokenB_idx" ON "public"."PositionsClmm"("tokenB");

-- CreateIndex
CREATE INDEX "PositionsClmm_updatedAt_idx" ON "public"."PositionsClmm"("updatedAt");
