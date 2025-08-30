import { NextApiRequest, NextApiResponse } from "next";
import archiver from "archiver";
import { generateMemeContent } from "../../../lib/memeTemplates";
import { 
  paletteFromTicker, 
  composeHeader, 
  composeFavicon, 
  makeQrPng,
  KitManifest 
} from "../../../lib/kitComposer";

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting function
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxRequests = 5;

  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Validation function
function validateParams(params: any): { valid: boolean; error?: string } {
  const { name, ticker, vibe, preset, shareUrl } = params;
  
  if (!name || !ticker || !vibe || !preset || !shareUrl) {
    return { valid: false, error: "Missing required parameters" };
  }
  
  if (name.length > 30) {
    return { valid: false, error: "Name too long (max 30 characters)" };
  }
  
     if (!/^[A-Z0-9]{3,8}$/.test(ticker)) {
     return { valid: false, error: "Invalid ticker format (3-8 characters: uppercase letters and numbers only)" };
   }
  
  const allowedVibes = ['funny', 'serious', 'degen'];
  if (!allowedVibes.includes(vibe)) {
    return { valid: false, error: "Invalid vibe" };
  }
  
  const allowedPresets = ['honest', 'degen'];
  if (!allowedPresets.includes(preset)) {
    return { valid: false, error: "Invalid preset" };
  }
  
  if (!shareUrl.startsWith('http')) {
    return { valid: false, error: "Invalid share URL" };
  }
  
  return { valid: true };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, ticker, vibe, preset, shareUrl } = req.query;

    // Validate parameters
    const validation = validateParams({ name, ticker, vibe, preset, shareUrl });
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Rate limiting (using IP address)
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const identifier = Array.isArray(clientIP) ? clientIP[0] : clientIP;
    
    if (!checkRateLimit(identifier)) {
      return res.status(429).json({ error: "Rate limit exceeded. Try again in 10 minutes." });
    }

    // Generate palette from ticker
    const palette = paletteFromTicker(ticker as string);
    
         // Generate meme content using templates directly (no external AI calls)
     const memeContent = generateMemeContent(name as string, ticker as string, vibe as any);
    
    // Create badge text
    const badge = preset === 'honest' ? '✅ Honest Launch' : '⚡ Degen Mode';
    
         // Generate images
     console.log(`Generating images for ${name} ($${ticker}) with palette:`, palette);
     
     const [ogImage, xHeader, tgHeader, favicon, qrCode] = await Promise.all([
       composeHeader({
         w: 1200,
         h: 630,
         text: `${name}`,
         subtext: `$${ticker}`,
         palette,
         badge
       }),
       composeHeader({
         w: 1500,
         h: 500,
         text: `${name}`,
         subtext: `$${ticker}`,
         palette,
         badge
       }),
       composeHeader({
         w: 1920,
         h: 1080,
         text: `${name}`,
         subtext: `$${ticker}`,
         palette,
         badge
       }),
       composeFavicon({
         ticker: ticker as string,
         palette
       }),
       makeQrPng(shareUrl as string)
     ]);
     
     console.log(`Successfully generated ${ogImage.length + xHeader.length + tgHeader.length + favicon.length + qrCode.length} bytes of image data`);

    // Create kit manifest
    const kitManifest: KitManifest = {
      name: name as string,
      ticker: ticker as string,
      vibe: vibe as string,
      preset: preset as string,
      palette,
      assets: {
        og: "og_1200x630.png",
        xHeader: "x_1500x500.png",
        tgHeader: "tg_1920x1080.png",
        favicon: "favicon_64.png",
        qr: "qr.png"
      },
      content: {
        threads: memeContent.twitterThreads,
        copypastas: memeContent.copypastas,
        roadmap: memeContent.roadmap
      },
      links: {
        sharePage: shareUrl as string
      }
    };

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${ticker}_meme_kit.zip"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add files to archive
    archive.append(ogImage, { name: 'og_1200x630.png' });
    archive.append(xHeader, { name: 'x_1500x500.png' });
    archive.append(tgHeader, { name: 'tg_1920x1080.png' });
    archive.append(favicon, { name: 'favicon_64.png' });
    archive.append(qrCode, { name: 'qr.png' });
    archive.append(JSON.stringify(kitManifest, null, 2), { name: 'kit.json' });

    // Finalize archive
    await archive.finalize();

     } catch (error) {
     console.error("Error generating meme kit ZIP:", error);
     
     // Provide more specific error messages
     if (error instanceof Error) {
       res.status(500).json({ error: `ZIP generation failed: ${error.message}` });
     } else {
       res.status(500).json({ error: "Internal server error during ZIP generation" });
     }
   }
}
