/**
 * Pinata IPFS Configuration and Utilities
 * Centralized configuration for Pinata API credentials and upload functions
 */

/**
 * Get Pinata API credentials with fallback to hardcoded values
 * This ensures the app works even if environment variables are not set
 */
export function getPinataCredentials() {
  return {
    apiKey: process.env.PINATA_API_KEY,
    secretKey: process.env.PINATA_SECRET_API_KEY
  };
}

/**
 * Upload image file to Pinata IPFS
 * @param file - The image file to upload
 * @returns Promise<string> - The IPFS URL of the uploaded image
 */
export async function uploadImageToPinata(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const { apiKey, secretKey } = getPinataCredentials();

  try {
    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      body: formData,
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: secretKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
  } catch (error: any) {
    console.error("Pinata image upload error:", error);
    throw new Error(`Failed to upload image to Pinata: ${error.message}`);
  }
}

/**
 * Upload JSON metadata to Pinata IPFS
 * @param metadata - The metadata object to upload
 * @returns Promise<string> - The IPFS URL of the uploaded metadata
 */
export async function uploadMetadataToPinata(metadata: any): Promise<string> {
  const { apiKey, secretKey } = getPinataCredentials();

  try {
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: apiKey,
        pinata_secret_api_key: secretKey,
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      throw new Error(`Pinata metadata upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
  } catch (error: any) {
    console.error("Pinata metadata upload error:", error);
    throw new Error(`Failed to upload metadata to Pinata: ${error.message}`);
  }
}

/**
 * Check if Pinata credentials are properly configured
 * @returns boolean - True if credentials are available
 */
export function isPinataConfigured(): boolean {
  const { apiKey, secretKey } = getPinataCredentials();
  return !!(apiKey && secretKey && apiKey !== "your_pinata_api_key_here" && secretKey !== "your_pinata_secret_api_key_here");
}
