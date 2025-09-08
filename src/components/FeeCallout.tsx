import Link from "next/link";
import { feeSummaryText } from "@/lib/feeCopy";

/**
 * Fee callout component that displays current fee information
 * Shows flat fee and skim percentage from environment variables
 */
export function FeeCallout() {
  const { flat, skimPct } = feeSummaryText();
  
  return (
    <p className="text-sm text-neutral-400 mt-3">
      Includes a flat fee of <strong>{flat} SOL</strong> and a <strong>{skimPct}%</strong> liquidity skim to the platform treasury.{" "}
      <Link href="/pricing">
        <a className="text-blue-500 hover:text-blue-400 underline">Learn more</a>
      </Link>.
    </p>
  );
}

/**
 * Compact fee callout for smaller spaces
 * Shows fee information in a more condensed format
 */
export function FeeCalloutCompact() {
  const { flat, skimPct } = feeSummaryText();
  
  return (
    <p className="text-xs text-neutral-400 mt-2">
      Includes <strong>{flat} SOL</strong> flat fee and <strong>{skimPct}%</strong> skim.{" "}
      <Link href="/pricing">
        <a className="text-blue-500 hover:text-blue-400 underline">Details</a>
      </Link>
    </p>
  );
}
