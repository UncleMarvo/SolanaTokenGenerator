-- CreateTable
CREATE TABLE "public"."CreatedToken" (
    "mint" TEXT NOT NULL,
    "creatorWallet" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatedToken_pkey" PRIMARY KEY ("mint")
);

-- CreateIndex
CREATE INDEX "CreatedToken_creatorWallet_idx" ON "public"."CreatedToken"("creatorWallet");

-- CreateIndex
CREATE INDEX "CreatedToken_createdAt_idx" ON "public"."CreatedToken"("createdAt");
