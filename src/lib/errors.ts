export function mapDexError(e: any) {
  const msg = (e?.message || "").toLowerCase();
  if (msg.includes("blockhash")) return { code:"BlockhashExpired", message:"Network busy, please try again." };
  if (msg.includes("insufficient") || msg.includes("0x1")) return { code:"InsufficientFunds", message:"Insufficient funds for this action." };
  if (msg.includes("user rejected")) return { code:"UserRejected", message:"You cancelled the transaction." };
  if (msg.includes("slippage")) return { code:"Slippage", message:"Slippage too low. Increase and retry." };
  return { code:"Unknown", message:"Transaction failed. Please retry." };
}
