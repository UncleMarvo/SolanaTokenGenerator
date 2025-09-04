import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "node:crypto";

/**
 * Admin Challenge Route
 * 
 * This endpoint creates a new authentication challenge for admin login.
 * It generates a cryptographically secure nonce and stores it in the database
 * along with the requesting wallet address.
 * 
 * The user must sign the returned message with their wallet to complete authentication.
 */
export async function POST(req: Request) {
  try {
    // Parse the request body to get the wallet address
    const { wallet } = await req.json().catch(() => ({}));
    
    // Validate that wallet address is provided
    if (!wallet) {
      return NextResponse.json(
        { error: "Missing wallet address" }, 
        { status: 400 }
      );
    }

    // Generate a cryptographically secure random nonce (32 hex characters)
    const nonce = crypto.randomBytes(16).toString("hex");
    
    // Get nonce TTL from environment (default: 5 minutes)
    const nonceTtlMinutes = process.env.NONCE_TTL_MIN || "5";
    
    // Create the challenge message that the user needs to sign
    const message = `Admin login\nWallet: ${wallet}\nNonce: ${nonce}\nExpires in ${nonceTtlMinutes} min`;
    
    // Store the challenge in the database
    const record = await prisma.adminSession.create({ 
      data: { 
        wallet, 
        nonce,
        used: false,
        createdAt: new Date()
      } 
    });

    // Return the challenge ID and message for the user to sign
    return NextResponse.json({ 
      id: record.id, 
      message: message 
    });

  } catch (error) {
    // Log the error for debugging (in production, you might want to use a proper logger)
    console.error("Admin challenge creation error:", error);
    
    // Return a generic error response
    return NextResponse.json(
      { error: "Failed to create admin challenge" }, 
      { status: 500 }
    );
  }
}
