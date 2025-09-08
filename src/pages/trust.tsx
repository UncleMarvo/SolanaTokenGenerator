"use client";

import DeleteWalletDataButton from "@/components/DeleteWalletDataButton";
import { feeSummaryText } from "@/lib/feeCopy";

export default function TrustPage() {
  const { flat, skimPct } = feeSummaryText();
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="h1">Trust & Transparency</h1>
        <p className="mt-3 text-neutral-300">How we launch, what we charge, and what we store.</p>
      </header>

      <section className="mb-8">
        <h2 className="h3">Honest Launch</h2>
        <ul className="mt-3 list-disc pl-5 text-sm text-neutral-300 space-y-2">
          <li>We enforce revoking <b>mint</b> and <b>freeze</b> authorities and verify on-chain.</li>
          <li>Your Share Page displays a live "Honest Verified" badge with on-chain proof.</li>
          <li>We never take ownership of your token. You control supply, LP, and keys.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold">Fees</h2>
        <ul className="mt-3 list-disc pl-5 text-sm text-neutral-300 space-y-2">
          <li><b>Launch flat fee:</b> {flat} SOL (charged at liquidity commit).</li>
          <li><b>Liquidity skim:</b> {skimPct}% of both sides at pool commit (pool receives {100 - Number(skimPct)}%).</li>
          <li><b>DEX swap fees:</b> Standard Orca/Raydium protocol fees apply. We do not alter these.</li>
          <li><b>Pro upgrade:</b> optional 0.25 SOL (unlocks premium branding assets).</li>
          <li>We do <b>not</b> take a token supply allocation.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold">What we store</h2>
        <ul className="mt-3 list-disc pl-5 text-sm text-neutral-300 space-y-2">
          <li>Wallet address (public), transaction signatures, pool ids, position mints, ticks, liquidity snapshots.</li>
          <li>Usage counters for AI features (rate-limit safety).</li>
          <li>No PII, no cookies required for basic launch flows.</li>
        </ul>
        <p className="text-xs text-neutral-500 mt-2">Data is used to provide product functionality (positions, proof badges, analytics). See Terms & Privacy below.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold">Delete my wallet data</h2>
        <p className="mt-2 text-sm text-neutral-300">
          To request deletion of wallet-scoped data, connect your wallet and sign a message to verify ownership.
          We will delete rows keyed by your wallet (positions, tx events, pro access). On-chain records cannot be deleted.
        </p>
        <DeleteWalletDataButton />
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold">Terms & Privacy (short)</h2>
        <p className="mt-3 text-sm text-neutral-300">
          This site provides tools for token creation and liquidity. On-chain actions are irreversible and at your own risk.
          By using the service you agree to pay disclosed fees. We do not custody assets, and we never take token allocations.
          We store only public chain data and necessary usage metadata. For full terms, contact support.
        </p>
      </section>
    </main>
  );
}
