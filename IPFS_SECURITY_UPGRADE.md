# IPFS Upload Security Upgrade

## Summary

Implemented a secure server-side IPFS upload solution to protect Pinata API keys from being exposed in the client-side code.

## Problem Fixed

**Before:** 
- Pinata API keys were hardcoded in client-side code with fallback values
- Keys would be exposed in browser JavaScript bundles and network requests
- Anyone could extract and abuse the API keys

**After:**
- API keys are stored server-side only (without `NEXT_PUBLIC_` prefix)
- All IPFS uploads go through a secure API endpoint
- Keys never leave the server

## Changes Made

### 1. New API Endpoint
**File:** `src/pages/api/ipfs/upload.ts`

A new secure server-side endpoint that:
- Handles both image file uploads and JSON metadata uploads
- Uses server-side environment variables (secure)
- Validates uploads and provides proper error handling
- Supports multipart/form-data for files and application/json for metadata
- Returns IPFS URL and hash to the client

### 2. Updated Pinata Utility Library
**File:** `src/lib/pinata.ts`

- Completely refactored to use secure server-side API
- `uploadImageToPinata()` now uses `/api/ipfs/upload`
- `uploadMetadataToPinata()` now uses `/api/ipfs/upload`
- `isPinataConfigured()` now tests actual service availability
- All API key references removed from client-side code

### 3. Updated Free Token Creation
**File:** `src/pages/create-token/free.tsx`

- Updated `uploadImagePinata()` function to use `/api/ipfs/upload`
- Updated metadata upload to use `/api/ipfs/upload`
- Removed all hardcoded API key fallbacks
- Improved error handling with detailed messages

### 4. Updated Pro Token Creation
**File:** `src/pages/create-token/pro.tsx`

- Updated `uploadImagePinata()` function to use `/api/ipfs/upload`
- Updated metadata upload to use `/api/ipfs/upload`
- Removed all hardcoded API key fallbacks
- Improved error handling with detailed messages

### 5. Updated Legacy Create Views
**Files:** `src/views/create/index.tsx`, `src/views/create/CreateViewWithPricing.tsx`

- Updated `uploadImagePinata()` functions to use `/api/ipfs/upload`
- Updated `uploadMetadata()` functions to use `/api/ipfs/upload`
- Removed all environment variable references from client code
- Improved error handling with user-friendly messages

### 6. Updated Dependencies
**File:** `package.json`

Added required packages for file upload handling:
- `formidable` v3.5.1 - Parses multipart form data
- `form-data` v4.0.0 - Creates form data for Pinata uploads
- `@types/formidable` v3.4.5 - TypeScript types

### 7. Updated Environment Configuration
**File:** `env.example`

- Changed from `NEXT_PUBLIC_PINATA_API_KEY` to `PINATA_API_KEY` (server-side only)
- Changed from `NEXT_PUBLIC_PINATA_SECRET_API_KEY` to `PINATA_SECRET_API_KEY` (server-side only)
- Added clear documentation about security importance

## Installation Steps

1. **Install new dependencies:**
   ```bash
   npm install
   ```

2. **Update your .env file:**
   ```bash
   # Remove these (if present):
   # PINATA_API_KEY=...
   # PINATA_SECRET_API_KEY=...
   
   # Add these instead (server-side only):
   PINATA_API_KEY=your_pinata_api_key_here
   PINATA_SECRET_API_KEY=your_pinata_secret_api_key_here
   ```

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

## Security Benefits

✅ **API Keys Protected** - Keys never exposed to client-side code  
✅ **Rate Limiting Ready** - Easy to add rate limiting to the API endpoint  
✅ **Validation** - Can validate uploads before sending to Pinata  
✅ **Monitoring** - Can log and monitor all IPFS uploads  
✅ **Cost Control** - Can implement usage quotas and restrictions  

## API Endpoint Usage

### Upload Image File
```javascript
const formData = new FormData();
formData.append("file", fileObject);

const response = await axios.post("/api/ipfs/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" }
});

console.log(response.data.ipfsUrl); // https://gateway.pinata.cloud/ipfs/...
```

### Upload JSON Metadata
```javascript
const response = await axios.post("/api/ipfs/upload", 
  { metadata: { name: "Token", symbol: "TKN", ... } },
  { headers: { "Content-Type": "application/json" } }
);

console.log(response.data.ipfsUrl); // https://gateway.pinata.cloud/ipfs/...
```

## Testing

1. Try creating a free token with image upload
2. Try creating a pro token with image upload
3. Verify that tokens are created successfully
4. Check that IPFS URLs are properly generated
5. Confirm no API keys are visible in browser DevTools

## Error Handling

The API endpoint provides clear error messages:
- `PinataNotConfigured` - API keys not set in environment
- `MissingMetadata` - No metadata provided in JSON request
- `MissingFile` - No file provided in form upload
- `UnsupportedContentType` - Wrong content type
- `UploadFailed` - General upload failure with details

## Notes

- Maximum file size: 10MB (configurable in API endpoint)
- Supports all image formats supported by Pinata
- Temporary files are automatically cleaned up after upload
- Server-side validation ensures only valid data reaches Pinata

---

**Status:** ✅ Complete and ready for testing
**Security Level:** 🔒 High - API keys fully protected


