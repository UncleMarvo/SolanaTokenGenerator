import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import jwt from "jsonwebtoken";

/**
 * Checks if a wallet address is in the authorized admin list
 * @param w - Wallet address to check
 * @returns true if wallet is authorized, false otherwise
 */
function authorizedWallet(w: string) {
  const list = (process.env.ADMIN_WALLETS||"").split(",").map(s=>s.trim()).filter(Boolean);
  return list.includes(w);
}

/**
 * POST endpoint for admin wallet verification
 * Verifies Solana wallet signatures and issues JWT admin tokens
 */
export async function POST(req: Request) {
  // Extract request body parameters
  const { id, wallet, signature, message } = await req.json().catch(()=>({}));
  
  // Validate required parameters
  if (!id || !wallet || !signature || !message) {
    return NextResponse.json({ error:"BadRequest" }, { status:400 });
  }

  // Find the admin session record
  const rec = await prisma.adminSession.findUnique({ where:{ id }});
  if (!rec) {
    return NextResponse.json({ error:"NoSession" }, { status:404 });
  }

  // Check session TTL (Time To Live)
  const ttlMs = Number(process.env.NONCE_TTL_MIN||5)*60*1000;
  if (Date.now() - new Date(rec.createdAt).getTime() > ttlMs) {
    return NextResponse.json({ error:"Expired" }, { status:400 });
  }
  
  // Prevent reuse of sessions
  if (rec.used) {
    return NextResponse.json({ error:"Used" }, { status:400 });
  }
  
  // Verify nonce is included in the signed message
  if (!message.includes(rec.nonce)) {
    return NextResponse.json({ error:"NonceMismatch" }, { status:400 });
  }

  // Verify the Solana wallet signature using nacl
  const pub = new PublicKey(wallet);
  const ok = nacl.sign.detached.verify(
    new TextEncoder().encode(message), 
    Buffer.from(signature,"base64"), 
    pub.toBytes()
  );
  
  if (!ok) {
    return NextResponse.json({ error:"BadSignature" }, { status:401 });
  }

  // Check if wallet is in authorized admin list
  if (!authorizedWallet(wallet)) {
    return NextResponse.json({ error:"NotAuthorized" }, { status:403 });
  }

  // Mark session as used and record verification time
  await prisma.adminSession.update({ 
    where:{ id }, 
    data:{ 
      used:true, 
      verifiedAt:new Date() 
    }
  });

  // Generate JWT admin token
  const token = jwt.sign(
    { sub: wallet, role:"admin" }, 
    process.env.ADMIN_JWT_SECRET!, 
    { expiresIn: `${process.env.SESSION_TTL_MIN||60}m` }
  );
  
  // Create response with secure HTTP-only cookie
  const res = NextResponse.json({ ok:true, admin:true });
  res.headers.set(
    "Set-Cookie", 
    `admin_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Number(process.env.SESSION_TTL_MIN||60)*60}`
  );
  
  return res;
}
