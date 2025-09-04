import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

/**
 * Admin Login Page
 * Handles Solana wallet authentication for admin access
 * Uses challenge-response pattern with wallet signature verification
 */
export default function AdminLogin() {
  const { publicKey, signMessage } = useWallet();
  const [status, setStatus] = useState("");

  /**
   * Handle admin login process
   * 1. Request challenge nonce from server
   * 2. Sign the challenge message with wallet
   * 3. Verify signature and get admin session
   */
  async function login() {
    // Check if wallet is connected and can sign messages
    if (!publicKey || !signMessage) { 
      setStatus("Connect an authorized admin wallet."); 
      return; 
    }
    
    const wallet = publicKey.toBase58();
    setStatus("Requesting challenge…");
    
    try {
      // Step 1: Request challenge nonce from server
      const r1 = await fetch("/api/admin/challenge", { 
        method: "POST", 
        headers: { "content-type": "application/json" }, 
        body: JSON.stringify({ wallet }) 
      });
      
      const j1 = await r1.json();
      if (!j1?.message) { 
        setStatus("Challenge failed."); 
        return; 
      }
      
      setStatus("Signing…");
      
      // Step 2: Sign the challenge message with wallet
      const sig = await signMessage(new TextEncoder().encode(j1.message));
      
      setStatus("Verifying…");
      
      // Step 3: Verify signature and get admin session
      const r2 = await fetch("/api/admin/verify", { 
        method: "POST", 
        headers: { "content-type": "application/json" }, 
        body: JSON.stringify({ 
          id: j1.id, 
          wallet, 
          signature: Buffer.from(sig).toString("base64"), 
          message: j1.message 
        }) 
      });
      
      const j2 = await r2.json();
      
      if (j2?.ok) { 
        setStatus("Success. Redirecting…"); 
        // Redirect to admin revenue page on successful authentication
        window.location.href = "/admin/revenue"; 
      } else {
        setStatus(`Denied: ${j2?.error || "unknown"}`);
      }
      
    } catch (error) {
      console.error("Login error:", error);
      setStatus("Login failed. Please try again.");
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="h2">Admin Login</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Sign a short message to prove wallet ownership.
      </p>
      
      <button 
        className="mt-6 border rounded-xl px-4 py-2 hover:bg-neutral-50 transition-colors" 
        onClick={login}
      >
        Sign in with Wallet
      </button>
      
      <div className="mt-3 text-sm text-neutral-500">{status}</div>
    </main>
  );
}
