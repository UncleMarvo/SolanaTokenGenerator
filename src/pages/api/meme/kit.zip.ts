import { NextApiRequest, NextApiResponse } from "next";
import archiver from "archiver";
import { generateMemeContent } from "../../../lib/memeTemplates";
import { 
  paletteFromTicker, 
  themeFromTicker,
  defaultLogoFromTicker,
  seededRng,
  composeHeader, 
  composeFavicon, 
  composeLogoTextMark,
  composeLogoBadgeMark,
  composeLogoPixelMark,
  composeSticker,
  makeQrPng,
  KitManifest 
} from "../../../lib/kitComposer";
import { hashString } from "../../../lib/hash";

// Simple LRU Cache implementation
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, { value: V; timestamp: number }>;
  private ttl: number;

  constructor(capacity: number, ttlMinutes: number) {
    this.capacity = capacity;
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: K, value: V): void {
    // Remove if exists
    this.cache.delete(key);

    // Remove oldest if at capacity
    if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // Add new item
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Cache for kit outputs (max 100 entries, 10 minute TTL)
const kitCache = new LRUCache<string, { manifest: KitManifest; buffers: Buffer[] }>(100, 10);

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

    // Create cache key
    const cacheKey = `${name}|${ticker}|${vibe}|${preset}|${shareUrl}`;
    
    // Check cache first
    const cached = kitCache.get(cacheKey);
    if (cached) {
      console.info(`Cache hit for ${name} ($${ticker}) - serving from cache`);
      
      // Set response headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${ticker}_meme_kit.zip"`);

      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add cached files to archive
      const { manifest, buffers } = cached;
      
      // Add files to archive
      archive.append(buffers[0], { name: 'og_1200x630.png' });
      archive.append(buffers[1], { name: 'x_1500x500.png' });
      archive.append(buffers[2], { name: 'tg_1920x1080.png' });
      archive.append(buffers[3], { name: 'favicon_64.png' });
      archive.append(buffers[4], { name: 'qr.png' });
      archive.append(buffers[5], { name: 'logo_text_1024.png' });
      archive.append(buffers[6], { name: 'logo_badge_1024.png' });
      archive.append(buffers[7], { name: 'logo_pixel_1024.png' });
      
      // Add stickers
      for (let i = 0; i < 6; i++) {
        archive.append(buffers[8 + i], { name: `stickers/${i + 1}.png` });
      }
      
      archive.append(JSON.stringify(manifest, null, 2), { name: 'kit.json' });

      // Finalize archive
      await archive.finalize();
      return;
    }

    // Generate palette, theme, and default logo from ticker
    const palette = paletteFromTicker(ticker as string);
    const theme = themeFromTicker(ticker as string);
    const defaultLogo = defaultLogoFromTicker(ticker as string);
    
    // Create seeded RNG for deterministic randomness
    const seed = hashString(`${name}${ticker}${vibe}${preset}`);
    const rng = seededRng(seed);
    
    // Generate meme content using templates directly (no external AI calls)
    const memeContent = generateMemeContent(name as string, ticker as string, vibe as any);
    
    // Create badge text
    const badge = preset === 'honest' ? '✅ Honest Launch' : '⚡ Degen Mode';
    
    // Generate images
    console.log(`Generating images for ${name} ($${ticker}) with palette:`, palette, 'theme:', theme, 'default logo:', defaultLogo);
    
    // Define sticker texts (6 most popular crypto slang)
    const stickerTexts = ["gm", "wen", "send it", "buy", "sell", "moon"];
    
         const [ogImage, xHeader, tgHeader, favicon, qrCode, logoTextMark, logoBadgeMark, logoPixelMark, ...stickers] = await Promise.all([
       composeHeader({
         w: 1200,
         h: 630,
         text: `${name}`,
         subtext: `$${ticker}`,
         palette,
         badge,
         theme
       }, rng),
       composeHeader({
         w: 1500,
         h: 500,
         text: `${name}`,
         subtext: `$${ticker}`,
         palette,
         badge,
         theme
       }, rng),
       composeHeader({
         w: 1920,
         h: 1080,
         text: `${name}`,
         subtext: `$${ticker}`,
         palette,
         badge,
         theme
       }, rng),
       composeFavicon({
         ticker: ticker as string,
         palette
       }),
       makeQrPng(shareUrl as string),
       composeLogoTextMark(ticker as string, palette),
       composeLogoBadgeMark(ticker as string, palette),
       composeLogoPixelMark(ticker as string, palette),
       ...stickerTexts.map(text => composeSticker(text, palette, rng))
     ]);
     
          const totalStickerBytes = stickers.reduce((sum, sticker) => sum + sticker.length, 0);
     console.log(`Successfully generated ${ogImage.length + xHeader.length + tgHeader.length + favicon.length + qrCode.length + logoTextMark.length + logoBadgeMark.length + logoPixelMark.length + totalStickerBytes} bytes of image data`);

     // Create kit manifest
     const kitManifest: KitManifest = {
       name: name as string,
       ticker: ticker as string,
       vibe: vibe as string,
       preset: preset as string,
       theme: theme,
       palette,
       assets: {
         og: "og_1200x630.png",
         xHeader: "x_1500x500.png",
         tgHeader: "tg_1920x1080.png",
         favicon: "favicon_64.png",
         qr: "qr.png",
         logos: {
           textMark: "logo_text_1024.png",
           badgeMark: "logo_badge_1024.png",
           pixelMark: "logo_pixel_1024.png",
           default: `logo_${defaultLogo}_1024.png`
         },
         stickers: [
           "stickers/1.png",
           "stickers/2.png", 
           "stickers/3.png",
           "stickers/4.png",
           "stickers/5.png",
           "stickers/6.png"
         ]
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

     // Store in cache
     const allBuffers = [ogImage, xHeader, tgHeader, favicon, qrCode, logoTextMark, logoBadgeMark, logoPixelMark, ...stickers];
     kitCache.set(cacheKey, { manifest: kitManifest, buffers: allBuffers });

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
     archive.append(logoTextMark, { name: 'logo_text_1024.png' });
     archive.append(logoBadgeMark, { name: 'logo_badge_1024.png' });
     archive.append(logoPixelMark, { name: 'logo_pixel_1024.png' });
     
     // Add stickers
     stickers.forEach((sticker, index) => {
       archive.append(sticker, { name: `stickers/${index + 1}.png` });
     });
     
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
