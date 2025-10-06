import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";

// Type definition for created token items
type Item = { 
  mint: string; 
  creatorWallet: string; 
  name: string; 
  ticker: string; 
  createdAt: string; 
};

// Type definition for honest status
type HonestStatus = {
  isHonest: boolean;
  mintNull: boolean;
  freezeNull: boolean;
};

/**
 * My Tokens Page
 * Displays all tokens created by the connected wallet
 * Provides links to token pages, liquidity wizard, and meme kit download
 */
export default function MyTokensPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, HonestStatus>>({});

  // Fetch tokens when wallet connection changes
  useEffect(() => {
    (async () => {
      if (!publicKey) { 
        setItems(null); 
        return; 
      }
      
      setLoading(true);
      try {
        const walletAddress = publicKey.toBase58();
        console.log('[MyTokens] Fetching tokens for wallet:', walletAddress);
        
        const r = await fetch(`/api/my-tokens?wallet=${walletAddress}`, { 
          cache: "no-store" 
        });
        const j = await r.json();
        console.log('[MyTokens] API response:', j);
        
        const fetchedItems = j?.ok ? j.items : [];
        console.log('[MyTokens] Fetched items:', fetchedItems);
        setItems(fetchedItems);
        
        // Batch fetch honest statuses for all tokens
        const mints = (fetchedItems || []).map(i => i.mint);
        if (mints.length) {
          const statusResponse = await fetch(`/api/honest-status/batch`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ mints })
          });
          const statusJson = await statusResponse.json();
          const statusMap: Record<string, HonestStatus> = {};
          if (statusJson?.ok && Array.isArray(statusJson.items)) {
            statusJson.items.forEach((st: any) => { 
              statusMap[st.mint] = st; 
            });
          }
          setStatuses(statusMap);
        }
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
            <button 
              onClick={() => router.push('/pricing')}
              className="btn btn-primary mt-4"
            >
              Create a Token
            </button>
          </div>
        )}

        {/* Token list */}
        {connected && !!items?.length && (
          <div className="grid mt-6 gap-4 md:grid-cols-2">
            {items.map((it) => {
              const st = statuses[it.mint];
              const honest = st?.isHonest;
              
              return (
                <article key={it.mint} className="card p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="h3">
                      {it.name} <span className="text-neutral-400">({it.ticker})</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <span 
                        className="chip" 
                        title={honest ? "Mint & freeze revoked" : "Pending enforcement"}
                      >
                        {honest ? "Honest Launch ✅" : "Pending Honest Launch"}
                      </span>
                      <span className="chip">Mint</span>
                    </div>
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
                  <Link href={`/token/${it.mint}`}>
                    <a className="btn btn-secondary">
                      Open Token Page
                    </a>
                  </Link>
                  <Link href={`/liquidity?mint=${it.mint}`}>
                    <a className="btn btn-secondary">
                      Liquidity Wizard
                    </a>
                  </Link>
                  <a 
                    href={`/api/meme/kit.zip?name=${encodeURIComponent(it.name)}&ticker=${encodeURIComponent(it.ticker)}&vibe=degen&preset=degen&shareUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/token/' + it.mint : '')}`} 
                    className="btn btn-secondary"
                  >
                    Download Meme Kit
                  </a>
                  {/* Enforce link for creators when token is not honest */}
                  {!honest && publicKey?.toBase58() === it.creatorWallet && (
                    <Link href={`/token/${it.mint}?enforce=1`}>
                      <a className="btn btn-primary">Enforce</a>
                    </Link>
                  )}
                </div>
              </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
