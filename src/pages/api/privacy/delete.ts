// Privacy data deletion endpoint
// TODO: implement signed-message verification & wallet-scope deletion
import type { NextApiRequest, NextApiResponse } from "next";

type DeleteResponse = {
  ok: boolean;
  message: string;
  note?: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteResponse>
) {
  // Only allow GET requests for now (can be expanded to POST with signed messages)
  if (req.method !== "GET") {
    return res.status(405).json({ 
      ok: false, 
      message: "Method not allowed. Use GET for now." 
    });
  }

  // TODO: Implement proper wallet verification
  // - Verify signed message from wallet
  // - Extract wallet address from signature
  // - Delete all wallet-scoped data from database
  // - Return confirmation of deletion

  return res.status(200).json({ 
    ok: true, 
    message: "Submit a signed request to delete wallet-scoped data.",
    note: "This endpoint will be expanded to handle actual data deletion with proper wallet verification."
  });
}
