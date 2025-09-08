/*
  Warnings:

  - Added the required column `amount` to the `CreatedToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `decimals` to the `CreatedToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `CreatedToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `image` to the `CreatedToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preset` to the `CreatedToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `symbol` to the `CreatedToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vibe` to the `CreatedToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."CreatedToken" ADD COLUMN     "amount" TEXT NOT NULL,
ADD COLUMN     "decimals" TEXT NOT NULL,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "image" TEXT NOT NULL,
ADD COLUMN     "links" JSONB,
ADD COLUMN     "preset" TEXT NOT NULL,
ADD COLUMN     "symbol" TEXT NOT NULL,
ADD COLUMN     "vibe" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "CreatedToken_symbol_idx" ON "public"."CreatedToken"("symbol");

-- CreateIndex
CREATE INDEX "CreatedToken_preset_idx" ON "public"."CreatedToken"("preset");

-- CreateIndex
CREATE INDEX "CreatedToken_vibe_idx" ON "public"."CreatedToken"("vibe");
