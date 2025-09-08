import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  createBurnInstruction,
} from "@solana/spl-token";

export type AdvancedProps = {
  mint: string; // token mint (SPL)
  creatorWallet: string; // from CreatedToken
  shareUrl: string; // /share/[mint] absolute or relative
  liquidityUrl: string; // /liquidity?mint=…
  kitUrl: string; // /api/kit/download?mint=…
  orcaPoolUrl?: string; // optional
  raydiumPoolUrl?: string; // optional
  ammLpMint?: string | null; // if you detected AMM LP mint for this token pair; null/undefined hides LP Burn
  onRecheck: () => void; // bust cache + refresh honest badge
  onEnforce?: () => void; // enforce flow
  onRegenerateKit?: (() => void) | null;
};

export default function AdvancedTools(p: AdvancedProps) {
  const { publicKey, signTransaction } = useWallet();
  const isCreator = publicKey?.toBase58() === p.creatorWallet;

  // Copy text to clipboard with toast notification
  async function copy(txt: string) {
    await navigator.clipboard.writeText(txt);
    // @ts-ignore
    window?.toast?.success?.("Copied");
  }

  // Minimal AMM LP burn handler (AMM only; NOT for CLMM)
  async function burnAmmLp(amountUi: number) {
    if (!p.ammLpMint) return;
    if (!publicKey || !signTransaction) return;

    try {
      const lpMint = new PublicKey(p.ammLpMint);
      const ata = await getAssociatedTokenAddress(lpMint, publicKey, false);

      // Get connection from window (assuming it's available globally)
      const conn =
        (window as any).solanaConnection || (window as any).connection;
      if (!conn) {
        throw new Error("Solana connection not found");
      }

      const acc = await getAccount(conn, ata);
      const decimals = 6; // common for AMM LP; TODO: fetch mint decimals if you prefer
      const amount = BigInt(Math.floor(amountUi * Math.pow(10, decimals)));

      if (amount <= 0n) throw new Error("Amount must be > 0");
      if (amount > acc.amount) throw new Error("Not enough LP balance");

      const ix = createBurnInstruction(ata, lpMint, publicKey, amount);
      const { blockhash } = await conn.getLatestBlockhash("confirmed");
      const tx = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash,
      }).add(ix);
      const signed = await signTransaction(tx);
      const sig = await conn.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });
      await conn.confirmTransaction(sig, "confirmed");

      // @ts-ignore
      window?.toast?.success?.("LP burn succeeded");
    } catch (e: any) {
      // @ts-ignore
      window?.toast?.error?.(e?.message || "LP burn failed");
    }
  }

  return (
    <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
      <details className="group">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-muted">Advanced Tools</h2>
            <div className="text-muted group-open:text-fg transition-colors">
              <svg
                className="w-5 h-5 transform group-open:rotate-180 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </summary>

        <div className="mt-6 space-y-6">
          <div className="text-muted text-sm">
            <p className="mb-4">
              <strong>⚠️ Advanced Features:</strong> These tools are for
              experienced users only. Some actions are irreversible.
            </p>
          </div>

          {/* Core quick actions */}
          <div className="bg-muted/10 border border-muted/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              {isCreator && p.onEnforce && (
                <button
                  className="btn btn-primary"
                  title="Revoke mint & freeze authorities"
                  onClick={p.onEnforce}
                >
                  Enforce Honest Launch
                </button>
              )}
              <button
                className="btn btn-secondary"
                title="Force fresh authority read & refresh badge"
                onClick={p.onRecheck}
              >
                Re-check status
              </button>
              <Link href={p.liquidityUrl}>
                <a className="btn btn-secondary" title="Open Liquidity Wizard">
                  Liquidity Wizard
                </a>
              </Link>
              <a
                className="btn btn-secondary"
                href={`https://solscan.io/token/${p.mint}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in Solscan
              </a>
              <button
                className="btn btn-secondary"
                onClick={() => copy(p.mint)}
                title="Copy mint address"
              >
                Copy Mint
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => copy(p.shareUrl)}
                title="Copy share URL"
              >
                Copy Share Link
              </button>
              {p.orcaPoolUrl && (
                <a
                  className="btn btn-primary"
                  href={p.orcaPoolUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Orca Pool
                </a>
              )}
              {p.raydiumPoolUrl && (
                <a
                  className="btn btn-primary"
                  href={p.raydiumPoolUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Raydium Pool
                </a>
              )}
            </div>
          </div>

          {/* Meme Kit actions */}
          <div className="bg-muted/10 border border-muted/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Meme Kit</h3>
            <div className="flex flex-wrap gap-2">
              <a className="btn btn-primary" href={p.kitUrl}>
                Download Kit
              </a>
              {p.onRegenerateKit && (
                <button
                  className="btn btn-ghost"
                  onClick={p.onRegenerateKit}
                  title="Rebuild kit (may use AI quota)"
                >
                  Regenerate Kit
                </button>
              )}
            </div>
          </div>

          {/* AMM LP Burn (only if ammLpMint provided) */}
          {p.ammLpMint && (
            <div className="bg-muted/10 border border-muted/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">
                LP Token Management (AMM only)
              </h3>
              <p className="text-muted text-sm mb-3">
                Burn AMM LP tokens to permanently retire liquidity tokens. This
                is NOT for CLMM positions (Orca/Raydium CLMM).
              </p>
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const amt = Number(
                    (e.currentTarget as any).amount?.value || "0"
                  );
                  burnAmmLp(amt);
                }}
              >
                <input
                  name="amount"
                  type="number"
                  step="0.000001"
                  min="0"
                  placeholder="Amount (LP UI units)"
                  className="input"
                />
                <button
                  className="btn btn-danger"
                  type="submit"
                  title="Burn LP tokens from your wallet"
                >
                  Burn LP
                </button>
              </form>
              <div className="text-xs text-muted bg-muted/20 p-3 rounded border border-muted/30 mt-3">
                <strong>Note:</strong> For CLMMs, use "Decrease Liquidity" in
                your Positions instead. Burning applies to AMM LP mints only.
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
