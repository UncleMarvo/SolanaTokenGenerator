export type Cluster = "mainnet" | "devnet";
export const NETWORK = (process.env.NETWORK === "devnet" ? "devnet" : "mainnet") as Cluster;
export const IS_DEVNET = NETWORK === "devnet";

const toBool = (v: string | undefined, def = false) =>
  v === undefined ? def : v === "1" || v.toLowerCase?.() === "true";
const toNum = (v: string | undefined, def = 0) => (Number.isFinite(Number(v)) ? Number(v) : def);

/** Devnet behaviors — default ON only when IS_DEVNET; overrideable via env */
export const DEV_RELAX_CONFIRM_MS = toNum(process.env.DEVNET_RELAX_CONFIRM_MS, IS_DEVNET ? 60000 : 0);
export const DEV_DISABLE_DEXSCR   = toBool(process.env.DEVNET_DISABLE_DEXSCR, IS_DEVNET ? true : false);
export const DEV_ALLOW_MANUAL_RAY = toBool(process.env.DEVNET_ALLOW_MANUAL_RAYDIUM, IS_DEVNET ? true : false);
