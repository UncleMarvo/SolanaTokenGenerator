/**
 * Pinata IPFS Configuration and Utilities
 * Secure server-side uploads via /api/ipfs/upload endpoint
 * API keys are kept secure on the server and never exposed to the client
 */

/**
 * Upload image file to Pinata IPFS via secure server-side API
 * @param file - The image file to upload
 * @returns Promise<string> - The IPFS URL of the uploaded image
 */
export async function uploadImageToPinata(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    // Upload via secure server-side API endpoint
    const response = await fetch("/api/ipfs/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.message || "Upload failed");
    }

    return data.ipfsUrl;
  } catch (error: any) {
    console.error("IPFS image upload error:", error);
    throw new Error(`Failed to upload image to IPFS: ${error.message}`);
  }
}

/**
 * Upload JSON metadata to Pinata IPFS via secure server-side API
 * @param metadata - The metadata object to upload
 * @returns Promise<string> - The IPFS URL of the uploaded metadata
 */
export async function uploadMetadataToPinata(metadata: any): Promise<string> {
  try {
    // Upload via secure server-side API endpoint
    const response = await fetch("/api/ipfs/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ metadata }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Metadata upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.message || "Metadata upload failed");
    }

    return data.ipfsUrl;
  } catch (error: any) {
    console.error("IPFS metadata upload error:", error);
    throw new Error(`Failed to upload metadata to IPFS: ${error.message}`);
  }
}

/**
 * Check if Pinata/IPFS upload service is available
 * @returns Promise<boolean> - True if the upload service is working
 */
export async function isPinataConfigured(): Promise<boolean> {
  try {
    // Try uploading a minimal test metadata object to check if the service is available
    const testMetadata = { test: true, timestamp: Date.now() };
    await uploadMetadataToPinata(testMetadata);
    return true;
  } catch (error) {
    console.warn("IPFS upload service not configured or unavailable:", error);
    return false;
  }
}
