-- AlterTable
ALTER TABLE "public"."TxEvent" ADD COLUMN     "dex" TEXT;

-- CreateIndex
CREATE INDEX "TxEvent_dex_idx" ON "public"."TxEvent"("dex");
