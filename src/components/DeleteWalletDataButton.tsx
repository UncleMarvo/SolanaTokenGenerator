"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";

export default function DeleteWalletDataButton() {
  const { publicKey, signMessage } = useWallet();

  async function handleDelete() {
    if (!publicKey || !signMessage) {
      toast.error("Connect a wallet that supports signing.");
      return;
    }
    try {
      const wallet = publicKey.toBase58();

      // 1) Fetch canonical message
      const r1 = await fetch(`/api/privacy/delete?wallet=${wallet}`);
      const j1 = await r1.json();
      if (!j1?.exampleMessage) {
        toast.error("Could not fetch message."); return;
      }
      const msg = j1.exampleMessage;

      // 2) Sign
      const sig = await signMessage(new TextEncoder().encode(msg));
      const sigB64 = Buffer.from(sig).toString("base64");

      // 3) POST
      const r2 = await fetch("/api/privacy/delete", {
        method:"POST", headers:{ "content-type":"application/json" },
        body: JSON.stringify({ wallet, signature: sigB64, message: msg })
      });
      const j2 = await r2.json();

      if (j2?.ok) {
        toast.success(`Deleted: positions=${j2.deleted?.positions}, events=${j2.deleted?.events}, pro=${j2.deleted?.pro}, sessions=${j2.deleted?.sessions}`);
      } else {
        toast.error(`Failed: ${j2?.error||"Unknown error"}`);
      }
    } catch(e:any){
      toast.error(e?.message||"Error");
    }
  }

  return (
    <button onClick={handleDelete} className="btn btn-ghost">
      Delete my wallet data
    </button>
  );
}
