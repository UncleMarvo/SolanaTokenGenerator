import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";

// Type definition for created token items
type Item = { 
  mint: string; 
  creatorWallet: string; 
  name: string; 
  ticker: string; 
  createdAt: string; 
};

/**
 * My Tokens Page
 * Displays all tokens created by the connected wallet
 * Provides links to token pages, liquidity wizard, and meme kit download
 */
export default function MyTokensPage() {
  const { publicKey, connected } = useWallet();
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch tokens when wallet connection changes
  useEffect(() => {
    (async () => {
      if (!publicKey) { 
        setItems(null); 
        return; 
      }
      
      setLoading(true);
      try {
        const r = await fetch(`/api/my-tokens?wallet=${publicKey.toBase58()}`, { 
          cache: "no-store" 
        });
        const j = await r.json();
        setItems(j?.ok ? j.items : []);
      } catch (error) { 
        console.error("Error fetching tokens:", error);
        setItems([]); 
      } finally { 
        setLoading(false); 
      }
    })();
  }, [publicKey?.toBase58()]);

  return (
    <main className="section">
      <div className="container">
        <h1 className="h1">My Tokens</h1>
        <p className="small mt-1">Tokens you've created with this wallet.</p>

        {/* Not connected state */}
        {!connected && (
          <div className="card p-6 mt-6">
            <p className="mb-3">Connect your wallet to see tokens you created.</p>
            <Link href="/">
              <a className="btn btn-primary">
                Back to Home
              </a>
            </Link>
          </div>
        )}

        {/* Loading state */}
        {connected && loading && (
          <div className="card p-6 mt-6">
            <p>Loading your tokens...</p>
          </div>
        )}

        {/* Empty state - no tokens created */}
        {connected && !loading && (items?.length ?? 0) === 0 && (
          <div className="card p-6 mt-6 text-center">
            <div className="h3 mb-1">No tokens yet</div>
            <p className="small">Create your first token to see it here.</p>
            <Link href="/">
              <a className="btn btn-primary mt-4">
                Create a Token
              </a>
            </Link>
          </div>
        )}

        {/* Token list */}
        {connected && !!items?.length && (
          <div className="grid mt-6 gap-4 md:grid-cols-2">
            {items.map((it) => (
              <article key={it.mint} className="card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="h3">
                    {it.name} <span className="text-neutral-400">({it.ticker})</span>
                  </h3>
                  <span className="chip">Mint</span>
                </div>
                
                {/* Mint address */}
                <p className="small mt-1 break-all text-neutral-300">
                  {it.mint}
                </p>
                
                {/* Creation date */}
                <p className="small mt-1">
                  Created: {new Date(it.createdAt).toLocaleString()}
                </p>
                
                {/* Action buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/share/${it.mint}`}>
                    <a className="btn btn-ghost">
                      Open Token Page
                    </a>
                  </Link>
                  <Link href={`/liquidity?mint=${it.mint}`}>
                    <a className="btn btn-ghost">
                      Liquidity Wizard
                    </a>
                  </Link>
                  <a 
                    href={`/api/kit/download?mint=${it.mint}`} 
                    className="btn btn-primary"
                  >
                    Download Meme Kit
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
