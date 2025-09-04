import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

// Canonical message users must sign
export function buildDeleteMessage(wallet: string, isoTs: string) {
  return [
    "Delete my wallet data",
    `Wallet: ${wallet}`,
    `Timestamp: ${isoTs}`,
    "This request deletes off-chain data stored by the app.",
    "On-chain records cannot be deleted.",
  ].join("\n");
}

const BodySchema = z.object({
  wallet: z.string().min(32).max(64),
  signature: z.string().min(44), // base64
  message: z.string().min(10),
});

const MAX_SKEW_MS = 10 * 60 * 1000; // 10 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Give clients the message format + current timestamp
    try {
      const wallet = (req.query.wallet as string) || "";
      const nowIso = new Date().toISOString();
      const example = wallet ? buildDeleteMessage(wallet, nowIso) : null;
      return res.status(200).json({
        ok: true,
        instructions: "POST with { wallet, signature(base64), message } where message matches buildDeleteMessage(wallet, ISO8601). Timestamp must be within 10 minutes.",
        now: nowIso,
        exampleMessage: example,
      });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: "ServerError", message: e?.message });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "MethodNotAllowed" });

  try {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: "BadRequest", details: parsed.error.flatten() });

    const { wallet, signature, message } = parsed.data;

    // Basic message validation: must include wallet and a Timestamp line (ISO 8601)
    if (!message.includes(wallet)) return res.status(400).json({ ok: false, error: "MessageWalletMismatch" });
    const tsLine = message.split("\n").find(l => l.startsWith("Timestamp: "));
    if (!tsLine) return res.status(400).json({ ok: false, error: "NoTimestamp" });
    const iso = tsLine.replace("Timestamp: ", "").trim();
    const ts = Date.parse(iso);
    if (!isFinite(ts)) return res.status(400).json({ ok: false, error: "BadTimestamp" });
    if (Math.abs(Date.now() - ts) > MAX_SKEW_MS) return res.status(400).json({ ok: false, error: "Expired", skewMs: Math.abs(Date.now() - ts) });

    // Reconstruct canonical message (prevents tampering of other lines)
    const canonical = buildDeleteMessage(wallet, iso);
    if (canonical !== message) return res.status(400).json({ ok: false, error: "BadMessageFormat" });

    // Verify ed25519 signature
    let pk: PublicKey;
    try { pk = new PublicKey(wallet); } catch { return res.status(400).json({ ok: false, error: "BadWallet" }); }
    const ok = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      new Uint8Array(Buffer.from(signature, "base64")),
      pk.toBytes()
    );
    if (!ok) return res.status(401).json({ ok: false, error: "BadSignature" });

    // Perform deletions (wallet-scoped)
    const [positions, events, pro, sessions] = await Promise.all([
      prisma.positionsClmm.deleteMany({ where: { wallet } }),
      prisma.txEvent.deleteMany({ where: { wallet } }),
      prisma.proAccess.deleteMany({ where: { wallet } }),
      prisma.adminSession.deleteMany({ where: { wallet } }),
    ]);

    return res.status(200).json({
      ok: true,
      deleted: {
        positions: positions.count,
        events: events.count,
        pro: pro.count,
        sessions: sessions.count,
      },
      note: "On-chain records cannot be deleted.",
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "ServerError", message: e?.message });
  }
}
