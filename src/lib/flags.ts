// Import centralized environment configuration
import { DEV_RELAX_CONFIRM_MS, DEV_DISABLE_DEXSCR, DEV_ALLOW_MANUAL_RAY } from './env';

export const flags = {
  orcaActions: process.env.ORCA_ACTIONS === "on",
  orcaCommit: process.env.DEX_ORCA_COMMIT === "on",
  
  // Devnet behavior flags from centralized configuration
  devnetRelaxConfirmMs: DEV_RELAX_CONFIRM_MS,
  devnetDisableDexScreener: DEV_DISABLE_DEXSCR,
  devnetAllowManualRaydium: DEV_ALLOW_MANUAL_RAY,
};
