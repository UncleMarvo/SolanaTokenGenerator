import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import formidable from "formidable";
import FormData from "form-data";
import fs from "fs";

// Disable the default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * POST /api/ipfs/upload
 * Securely uploads files or JSON metadata to Pinata IPFS
 * 
 * Content-Type: multipart/form-data (for file uploads)
 * Body: { file: File }
 * 
 * Content-Type: application/json (for metadata uploads)
 * Body: { metadata: object }
 * 
 * Returns:
 * - 200: { ok: true, ipfsUrl: string, ipfsHash: string }
 * - 400: { ok: false, error: string }
 * - 500: { ok: false, error: string, message?: string }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "MethodNotAllowed",
    });
  }

  try {
    // Get Pinata API credentials from server-side environment variables
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretKey = process.env.PINATA_SECRET_API_KEY;

    // Validate that API keys are configured
    if (!pinataApiKey || !pinataSecretKey) {
      console.error("Pinata API keys not configured in environment variables");
      return res.status(500).json({
        ok: false,
        error: "PinataNotConfigured",
        message: "IPFS upload service is not configured. Please contact support.",
      });
    }

    const contentType = req.headers["content-type"] || "";

    // Handle JSON metadata upload
    if (contentType.includes("application/json")) {
      return await handleJsonUpload(req, res, pinataApiKey, pinataSecretKey);
    }

    // Handle file upload (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      return await handleFileUpload(req, res, pinataApiKey, pinataSecretKey);
    }

    // Unsupported content type
    return res.status(400).json({
      ok: false,
      error: "UnsupportedContentType",
      message: "Content-Type must be application/json or multipart/form-data",
    });
  } catch (error: any) {
    console.error("Error in /api/ipfs/upload:", error);
    return res.status(500).json({
      ok: false,
      error: "UploadFailed",
      message: error?.message || "Failed to upload to IPFS",
    });
  }
}

/**
 * Handle JSON metadata upload to Pinata
 */
async function handleJsonUpload(
  req: NextApiRequest,
  res: NextApiResponse,
  apiKey: string,
  secretKey: string
) {
  // Parse JSON body
  const body = await parseJsonBody(req);

  if (!body || !body.metadata) {
    return res.status(400).json({
      ok: false,
      error: "MissingMetadata",
      message: "Request body must include 'metadata' field",
    });
  }

  // Upload JSON to Pinata
  const response = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    body.metadata,
    {
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: apiKey,
        pinata_secret_api_key: secretKey,
      },
    }
  );

  const ipfsHash = response.data.IpfsHash;
  const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

  return res.status(200).json({
    ok: true,
    ipfsUrl,
    ipfsHash,
  });
}

/**
 * Handle file upload to Pinata
 */
async function handleFileUpload(
  req: NextApiRequest,
  res: NextApiResponse,
  apiKey: string,
  secretKey: string
) {
  // Parse multipart form data
  const form = formidable({
    maxFileSize: 10 * 1024 * 1024, // 10MB limit
    keepExtensions: true,
  });

  const [fields, files] = await form.parse(req);

  // Get the uploaded file
  const fileArray = files.file;
  if (!fileArray || fileArray.length === 0) {
    return res.status(400).json({
      ok: false,
      error: "MissingFile",
      message: "No file provided in 'file' field",
    });
  }

  const file = fileArray[0];

  // Create form data for Pinata
  const formData = new FormData();
  formData.append("file", fs.createReadStream(file.filepath), {
    filename: file.originalFilename || "upload",
    contentType: file.mimetype || "application/octet-stream",
  });

  try {
    // Upload file to Pinata
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: apiKey,
          pinata_secret_api_key: secretKey,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const ipfsHash = response.data.IpfsHash;
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    // Clean up temporary file
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      console.warn("Failed to cleanup temp file:", cleanupError);
    }

    return res.status(200).json({
      ok: true,
      ipfsUrl,
      ipfsHash,
    });
  } catch (uploadError: any) {
    // Clean up temporary file on error
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      console.warn("Failed to cleanup temp file:", cleanupError);
    }

    throw uploadError;
  }
}

/**
 * Parse JSON body from request
 */
function parseJsonBody(req: NextApiRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}


