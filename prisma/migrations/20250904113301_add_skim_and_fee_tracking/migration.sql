-- AlterTable
ALTER TABLE "public"."TxEvent" ADD COLUMN     "flatSol" DOUBLE PRECISION,
ADD COLUMN     "skimA" TEXT,
ADD COLUMN     "skimB" TEXT,
ADD COLUMN     "skimBp" INTEGER;
