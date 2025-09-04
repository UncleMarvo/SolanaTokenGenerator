import { NextResponse } from "next/server";

/**
 * Admin Logout Route
 * Clears the admin session cookie to log out the user
 * Sets cookie expiration to 0 to immediately invalidate it
 */
export async function POST() {
  // Create success response
  const res = NextResponse.json({ ok: true });
  
  // Clear admin session cookie by setting Max-Age to 0
  // This immediately expires the cookie and logs out the user
  res.headers.set(
    "Set-Cookie", 
    "admin_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
  );
  
  return res;
}
