-- Migration: Add fee tracking fields to TxEvent table
-- Date: 2024-01-XX
-- Description: Add fields to track platform fees for transparency and admin monitoring

-- Add new fee tracking columns
ALTER TABLE "TxEvent" ADD COLUMN "skimBp" INTEGER;
ALTER TABLE "TxEvent" ADD COLUMN "skimA" TEXT;
ALTER TABLE "TxEvent" ADD COLUMN "skimB" TEXT;
ALTER TABLE "TxEvent" ADD COLUMN "flatSol" DOUBLE PRECISION;

-- Add comments for documentation
COMMENT ON COLUMN "TxEvent"."skimBp" IS 'Skim basis points (e.g., 200 for 2%)';
COMMENT ON COLUMN "TxEvent"."skimA" IS 'Skimmed amount for token A';
COMMENT ON COLUMN "TxEvent"."skimB" IS 'Skimmed amount for token B';
COMMENT ON COLUMN "TxEvent"."flatSol" IS 'Flat fee in SOL';

-- Update existing records to have NULL values for new fields
-- (This is automatic in PostgreSQL, but documenting for clarity)
-- No data migration needed as new fields are nullable
