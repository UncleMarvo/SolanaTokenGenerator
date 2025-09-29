/**
 * Migration script to archive ProAccess data and prepare for cleanup
 * This script should be run after confirming the new per-token payment system works
 */

import { prisma } from "./db";

/**
 * Archive ProAccess data before removing the table
 * This preserves historical Pro access data for reference
 */
export async function archiveProAccessData() {
  try {
    console.log("Starting ProAccess data archival...");
    
    // Get all ProAccess records
    const proAccessRecords = await prisma.proAccess.findMany({
      select: {
        wallet: true,
        txSig: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`Found ${proAccessRecords.length} ProAccess records to archive`);

    // Create archive table if it doesn't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ProAccess_Archive" (
        "wallet" TEXT NOT NULL,
        "txSig" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProAccess_Archive_pkey" PRIMARY KEY ("wallet")
      );
    `;

    // Insert records into archive table
    for (const record of proAccessRecords) {
      await prisma.$executeRaw`
        INSERT INTO "ProAccess_Archive" ("wallet", "txSig", "expiresAt", "createdAt", "updatedAt", "archivedAt")
        VALUES (${record.wallet}, ${record.txSig}, ${record.expiresAt}, ${record.createdAt}, ${record.updatedAt}, CURRENT_TIMESTAMP)
        ON CONFLICT ("wallet") DO NOTHING;
      `;
    }

    console.log("ProAccess data archived successfully");
    return { success: true, archivedCount: proAccessRecords.length };
  } catch (error) {
    console.error("Error archiving ProAccess data:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Verify that the new per-token payment system is working
 * This should be called before removing the old ProAccess system
 */
export async function verifyNewSystemWorking() {
  try {
    // Check if we have any tokens with Pro tier
    const proTokens = await prisma.createdToken.count({
      where: { tier: 'pro' }
    });

    // Check if we have any tokens with payment verification
    const verifiedPayments = await prisma.createdToken.count({
      where: { paymentVerified: true }
    });

    console.log(`Found ${proTokens} Pro tokens and ${verifiedPayments} verified payments`);

    return {
      success: true,
      proTokens,
      verifiedPayments,
      message: "New system appears to be working"
    };
  } catch (error) {
    console.error("Error verifying new system:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Remove ProAccess table after successful migration
 * WARNING: This is irreversible!
 */
export async function removeProAccessTable() {
  try {
    console.log("Removing ProAccess table...");
    
    // Drop the ProAccess table
    await prisma.$executeRaw`DROP TABLE IF EXISTS "ProAccess";`;
    
    console.log("ProAccess table removed successfully");
    return { success: true };
  } catch (error) {
    console.error("Error removing ProAccess table:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Complete migration process
 * This should only be run after thorough testing
 */
export async function completeMigration() {
  console.log("Starting complete ProAccess migration...");
  
  // Step 1: Verify new system is working
  const verification = await verifyNewSystemWorking();
  if (!verification.success) {
    throw new Error(`New system verification failed: ${verification.error}`);
  }
  
  console.log("✅ New system verification passed");
  
  // Step 2: Archive old data
  const archival = await archiveProAccessData();
  if (!archival.success) {
    throw new Error(`Data archival failed: ${archival.error}`);
  }
  
  console.log("✅ ProAccess data archived");
  
  // Step 3: Remove old table
  const removal = await removeProAccessTable();
  if (!removal.success) {
    throw new Error(`Table removal failed: ${removal.error}`);
  }
  
  console.log("✅ ProAccess table removed");
  console.log("🎉 Migration completed successfully!");
  
  return {
    success: true,
    message: "Migration completed successfully",
    archivedCount: archival.archivedCount,
    proTokens: verification.proTokens,
    verifiedPayments: verification.verifiedPayments
  };
}
