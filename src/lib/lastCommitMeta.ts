/**
 * Last Commit Metadata Storage
 * Persists transaction IDs and Orca position data for each token mint
 * Uses in-memory Map with API-based disk persistence (survives server restarts)
 */

export type Meta = {
  txid: string;           // Transaction signature
  whirlpool?: string;     // Orca whirlpool address (if applicable)
  tickLower?: number;     // Lower tick bound (if applicable)
  tickUpper?: number;     // Upper tick bound (if applicable)
  ts: number;            // Timestamp when saved
};

// In-memory storage with disk persistence
const mem = new Map<string, Meta>();

// Bootstrap from disk on startup (client-side only)
(function init() {
  // Only run on client-side to avoid server-side fetch errors
  if (typeof window === "undefined") {
    return;
  }
  
  try {
    // Load data from disk via API route
    fetch("/api/admin/persist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "load" })
    })
    .then(response => response.json())
    .then(result => {
      if (result.data) {
        for (const [k, v] of Object.entries(result.data)) {
          // Type guard to ensure v has required Meta properties
          if (v && typeof v === 'object' && 'txid' in v && 'ts' in v) {
            mem.set(k, v as Meta);
          }
        }
        console.log(`Loaded ${mem.size} transaction records from disk`);
      }
    })
    .catch(error => {
      console.warn("Failed to load transaction metadata from disk:", error);
    });
  } catch (error) {
    console.warn("Failed to initialize persistence:", error);
  }
})();

/**
 * Convert in-memory Map to plain object for serialization
 */
function toObj() {
  const o: Record<string, Meta> = {};
  for (const [k, v] of mem.entries()) o[k] = v;
  return o;
}

/**
 * Save transaction metadata for a specific mint
 */
export function saveTx(mint: string, meta: Omit<Meta, "ts">) {
  const rec = { ...meta, ts: Date.now() };
  mem.set(mint, rec);
  
  // Schedule disk persistence via API route (client-side only)
  if (typeof window !== "undefined") {
    try {
      fetch("/api/admin/persist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "save", 
          data: toObj() 
        })
      }).catch(error => {
        console.warn("Failed to persist to disk:", error);
      });
    } catch (error) {
      console.warn("Failed to schedule disk save:", error);
    }
  }
  
  console.log(`Saved tx metadata for ${mint.slice(0, 8)}...:`, meta.txid);
}

/**
 * Get metadata for a specific mint
 */
export function getForMint(mint: string): Meta | undefined {
  return mem.get(mint);
}

/**
 * Get all stored metadata (for debugging/admin purposes)
 */
export function getAllMetadata(): Map<string, Meta> {
  return new Map(mem);
}

/**
 * Clear metadata for a specific mint
 */
export function clearForMint(mint: string): boolean {
  return mem.delete(mint);
}

/**
 * Get metadata count (for monitoring)
 */
export function getMetadataCount(): number {
  return mem.size;
}
