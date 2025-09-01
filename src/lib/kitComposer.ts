import sharp from 'sharp';
import QRCode from 'qrcode';
import { hashString, hashToRange, hslToHex } from './hash';

// Deterministic PRNG (Linear Congruential Generator)
export function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0; // LCG parameters
    return (state & 0x7fffffff) / 0x7fffffff; // Return 0..1
  };
}

// Types
export type Theme = "neonGrid" | "waveGlow" | "posterize";

export interface Palette {
  bg: string;
  fg: string;
  accent: string;
  accent2: string;
}

export interface ComposeOptions {
  w: number;
  h: number;
  text: string;
  subtext?: string;
  palette: Palette;
  badge?: string;
  theme: Theme;
}

export interface FaviconOptions {
  ticker: string;
  palette: Palette;
}

// Degen Neon fallback palette
const DEGEN_NEON_PALETTE: Palette = {
  bg: '#0F1115',
  fg: '#E6F1FF',
  accent: '#8AFFEF',
  accent2: '#FF8A8A'
};

// Generate deterministic theme from ticker
export function themeFromTicker(ticker: string): Theme {
  const hash = hashString(ticker);
  const themeIndex = hashToRange(hash >> 4, 3); // Use different bits for theme selection
  
  const themes: Theme[] = ["neonGrid", "waveGlow", "posterize"];
  return themes[themeIndex];
}

// Generate deterministic default logo variant from ticker
export function defaultLogoFromTicker(ticker: string): string {
  const hash = hashString(ticker);
  const logoIndex = hashToRange(hash >> 6, 3); // Use different bits for logo selection
  
  const logos = ["textMark", "badgeMark", "pixelMark"];
  return logos[logoIndex];
}

// Generate deterministic palette from ticker
export function paletteFromTicker(ticker: string): Palette {
  const hash = hashString(ticker);
  
  // Generate base colors
  const hue1 = hashToRange(hash, 360);
  const hue2 = (hue1 + 180) % 360; // Complementary
  const hue3 = (hue1 + 120) % 360; // Triadic
  const hue4 = (hue1 + 240) % 360; // Second accent (opposite to triadic)
  
  const saturation = 70 + hashToRange(hash >> 8, 30); // 70-100%
  const lightness = 45 + hashToRange(hash >> 16, 20); // 45-65%
  
  // Convert to hex
  const bg = hslToHex(hue1, saturation, 15); // Dark background
  const fg = hslToHex(hue2, saturation, 90); // Light foreground
  const accent = hslToHex(hue3, saturation, lightness); // Accent color
  const accent2 = hslToHex(hue4, saturation, lightness); // Second accent color
  
  return { bg, fg, accent, accent2 };
}

// Simple luminance-based contrast check
function contrastOK(fgHex: string, bgHex: string): boolean {
  // Simple luminance calculation (approximate)
  const getLuminance = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  
  const fgLum = getLuminance(fgHex);
  const bgLum = getLuminance(bgHex);
  const contrast = Math.abs(fgLum - bgLum);
  
  return contrast > 0.3; // Minimum contrast threshold
}

// Ensure text has good contrast against background
function ensureContrast(fg: string, bg: string, fallback: string): string {
  return contrastOK(fg, bg) ? fg : fallback;
}

// Create theme-specific background SVG
function createThemeBackground(w: number, h: number, palette: Palette, theme: Theme, rng: () => number): string {
  switch (theme) {
    case "neonGrid":
      const gridOffset = Math.floor(rng() * 20);
      const glowRadius = 30 + Math.floor(rng() * 20);
      return `
        <defs>
          <pattern id="gridPattern" x="${gridOffset}" y="${gridOffset}" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${palette.accent}" strokeWidth="1" opacity="0.3"/>
          </pattern>
          <radialGradient id="cornerGlow" cx="0%" cy="0%" r="50%">
            <stop offset="0%" style="stop-color:${palette.accent};stop-opacity:0.6"/>
            <stop offset="100%" style="stop-color:${palette.accent};stop-opacity:0"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="${palette.bg}"/>
        <rect width="100%" height="100%" fill="url(#gridPattern)"/>
        <circle cx="${w - 60}" cy="60" r="${glowRadius}" fill="url(#cornerGlow)"/>
      `;
      
    case "waveGlow":
      const waveCenterX = 40 + Math.floor(rng() * 20);
      const waveCenterY = 40 + Math.floor(rng() * 20);
      const noiseFreq = 0.6 + rng() * 0.4;
      return `
        <defs>
          <radialGradient id="waveGradient" cx="${waveCenterX}%" cy="${waveCenterY}%" r="70%">
            <stop offset="0%" style="stop-color:${palette.accent};stop-opacity:0.4"/>
            <stop offset="50%" style="stop-color:${palette.accent};stop-opacity:0.1"/>
            <stop offset="100%" style="stop-color:${palette.bg};stop-opacity:1"/>
          </radialGradient>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="${noiseFreq}" numOctaves="4" result="noise"/>
            <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.05 0" result="noiseOpacity"/>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#waveGradient)"/>
        <rect width="100%" height="100%" filter="url(#noise)" opacity="0.05"/>
      `;
      
    case "posterize":
      const accentX = 0.25 + rng() * 0.1;
      const accentY = 0.65 + rng() * 0.1;
      const dotRadius = 6 + Math.floor(rng() * 4);
      return `
        <defs>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${palette.accent2};stop-opacity:0.8"/>
            <stop offset="100%" style="stop-color:${palette.accent2};stop-opacity:0.3"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="${palette.bg}"/>
        <polygon points="0,${h} ${w * accentX},0 ${w * (accentX + 0.1)},0 ${w},${h * accentY}" fill="url(#accentGradient)"/>
        <circle cx="${w * 0.8}" cy="${h * 0.2}" r="${dotRadius}" fill="${palette.accent}" opacity="0.6"/>
      `;
      
    default:
      return `<rect width="100%" height="100%" fill="${palette.bg}"/>`;
  }
}

// Create SVG text overlay
function createTextSVG(options: ComposeOptions, rng: () => number): string {
  const { w, h, text, subtext, palette, badge, theme } = options;
  
  const fontSize = Math.min(w / 15, 48);
  const subFontSize = Math.min(w / 25, 24);
  const badgeFontSize = Math.min(w / 30, 18);
  
  const textY = h / 2 - (subtext ? fontSize / 2 : 0);
  const subtextY = h / 2 + fontSize / 2;
  const badgeY = h - 40;
  
  // Ensure text colors have good contrast
  const mainTextColor = ensureContrast(palette.fg, palette.bg, "#FFFFFF");
  const subTextColor = ensureContrast(palette.accent, palette.bg, "#FFFFFF");
  const badgeColor = ensureContrast(palette.accent, palette.bg, "#FFFFFF");
  
  return `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
             ${createThemeBackground(w, h, palette, theme, rng)}
      
      <text x="50%" y="${textY}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            text-anchor="middle" 
            fill="${mainTextColor}"
            filter="url(#glow)">
        ${text}
      </text>
      
      ${subtext ? `
        <text x="50%" y="${subtextY}" 
              font-family="Arial, sans-serif" 
              font-size="${subFontSize}" 
              text-anchor="middle" 
              fill="${subTextColor}"
              opacity="0.8">
          ${subtext}
        </text>
      ` : ''}
      
      ${badge ? `
        <text x="50%" y="${badgeY}" 
              font-family="Arial, sans-serif" 
              font-size="${badgeFontSize}" 
              text-anchor="middle" 
              fill="${badgeColor}"
              filter="url(#glow)">
          ${badge}
        </text>
      ` : ''}
    </svg>
  `;
}

// Compose header image
export async function composeHeader(options: ComposeOptions, rng: () => number): Promise<Buffer> {
  const { w, h } = options;
  
  // Create SVG overlay
  const svg = createTextSVG(options, rng);
  const svgBuffer = Buffer.from(svg);
  
  // Create image with sharp
  const image = sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  });
  
  // Overlay SVG
  const result = await image
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
    
  return result;
}

// Compose favicon
export async function composeFavicon(options: FaviconOptions): Promise<Buffer> {
  const { ticker, palette } = options;
  const size = 64;
  
  // Get initials (first 2 characters)
  const initials = ticker.slice(0, 2).toUpperCase();
  const fontSize = 24;
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="faviconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${palette.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${palette.accent};stop-opacity:0.8" />
        </linearGradient>
        <filter id="faviconGlow">
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#faviconGradient)" rx="8"/>
      
      <text x="50%" y="50%" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            text-anchor="middle" 
            dominant-baseline="middle"
            fill="${palette.fg}"
            filter="url(#faviconGlow)">
        ${initials}
      </text>
    </svg>
  `;
  
  const svgBuffer = Buffer.from(svg);
  
  const image = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  });
  
  const result = await image
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
    
  return result;
}

// Sticker composition function
export async function composeSticker(text: string, palette: Palette, rng: () => number): Promise<Buffer> {
  const size = 512;
  const fontSize = 80;
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="stickerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${palette.bg};stop-opacity:0.9" />
          <stop offset="50%" style="stop-color:${palette.accent};stop-opacity:0.2" />
          <stop offset="100%" style="stop-color:${palette.accent2};stop-opacity:0.1" />
        </linearGradient>
        <filter id="stickerGlow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="stickerShadow">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="${palette.bg}" flood-opacity="0.5"/>
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#stickerGradient)" rx="20" filter="url(#stickerShadow)"/>
      
      <!-- Accent shape (random diagonal line) -->
      <line x1="0" y1="${size}" x2="${size * (0.25 + rng() * 0.1)}" y2="0" 
            stroke="${palette.accent}" 
            strokeWidth="${6 + Math.floor(rng() * 4)}" 
            opacity="${0.5 + rng() * 0.3}"/>
      
      <text x="50%" y="50%" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            text-anchor="middle" 
            dominant-baseline="middle"
            fill="${palette.fg}"
            filter="url(#stickerGlow)">
        ${text}
      </text>
    </svg>
  `;
  
  const svgBuffer = Buffer.from(svg);
  
  const image = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  });
  
  const result = await image
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
    
  return result;
}

// Helper function to create a timeout promise
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), ms);
  });
}

// Helper function to check for disallowed terms in name/ticker
function containsDisallowedTerms(text: string): boolean {
  const disallowedTerms = [
    'nude', 'naked', 'sex', 'porn', 'adult', 'explicit', 'inappropriate',
    'offensive', 'hate', 'violence', 'gore', 'blood', 'death', 'kill',
    'terror', 'bomb', 'weapon', 'drug', 'illegal', 'criminal'
  ];
  
  const lowerText = text.toLowerCase();
  return disallowedTerms.some(term => lowerText.includes(term));
}

// Generate AI logo using OpenAI API
async function generateAiLogo(opts: { name: string; ticker: string; vibe: string }): Promise<Buffer | null> {
  const { name, ticker, vibe } = opts;
  
  // Safety check - skip AI if disallowed terms detected
  if (containsDisallowedTerms(name) || containsDisallowedTerms(ticker)) {
    console.log('Skipping AI logo generation due to disallowed terms');
    return null;
  }
  
  // Check if AI is enabled and API key is available
  if (process.env.MEME_AI_LOGO !== "on" || !process.env.OPENAI_API_KEY) {
    return null;
  }
  
  try {
    const prompt = `Create a bold, simple, high-contrast logo for a Solana meme token named "${name}" ($${ticker}). Neon palette, dark bg, crisp edges, flat style. Vibe: ${vibe}. No text other than ticker initials.`;
    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'b64_json'
      })
    });
    
    if (!response.ok) {
      console.log('OpenAI API request failed:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (data.data && data.data[0] && data.data[0].b64_json) {
      return Buffer.from(data.data[0].b64_json, 'base64');
    }
    
    return null;
  } catch (error) {
    console.log('AI logo generation error:', error);
    return null;
  }
}

// Logo composition functions
export async function composeLogoTextMarkSVG(ticker: string, palette: Palette): Promise<Buffer> {
  const size = 1024;
  const initials = ticker.slice(0, 2).toUpperCase();
  const fontSize = 320;
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="textMarkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${palette.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${palette.accent};stop-opacity:0.3" />
        </linearGradient>
        <filter id="textMarkGlow">
          <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#textMarkGradient)"/>
      
      <text x="50%" y="50%" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            text-anchor="middle" 
            dominant-baseline="middle"
            fill="${palette.fg}"
            filter="url(#textMarkGlow)">
        ${initials}
      </text>
    </svg>
  `;
  
  const svgBuffer = Buffer.from(svg);
  
  const image = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  });
  
  const result = await image
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
    
  return result;
}

// New wrapper function that tries AI first, then falls back to SVG
export async function composeLogoTextMark(
  ticker: string, 
  palette: Palette, 
  name?: string, 
  vibe?: string, 
  options?: { 
    aiLimiter?: { take(ip: string): boolean }, 
    aiDailyGate?: { take(): boolean },
    ip?: string 
  }
): Promise<Buffer> {
  // Try AI logo generation if enabled and we have the required parameters
  const aiOn = process.env.MEME_AI_LOGO === "on" && process.env.OPENAI_API_KEY && name && vibe;
  
  if (aiOn) {
    // Check both AI rate limiting gates
    const ipAllowed = options?.aiLimiter && options?.ip && options.aiLimiter.take(options.ip);
    const dailyAllowed = options?.aiDailyGate?.take();
    
    if (!ipAllowed) {
      console.log('AI rate limit exceeded for', options?.ip, '- falling back to SVG');
      return await composeLogoTextMarkSVG(ticker, palette);
    }
    
    if (!dailyAllowed) {
      console.info('[ai] daily cap reached');
      return await composeLogoTextMarkSVG(ticker, palette);
    }
    
    try {
      // Race between AI generation and timeout
      const aiBuffer = await Promise.race([
        generateAiLogo({ name, ticker, vibe }),
        timeout(3500) // 3.5 second timeout
      ]);
      
      if (aiBuffer && aiBuffer.length > 0) {
        console.log('Successfully generated AI logo for', ticker);
        return aiBuffer;
      }
    } catch (error) {
      console.log('AI logo generation failed, falling back to SVG:', error);
    }
  }
  
  // Fallback to SVG logo
  return await composeLogoTextMarkSVG(ticker, palette);
}

export async function composeLogoBadgeMark(ticker: string, palette: Palette): Promise<Buffer> {
  const size = 1024;
  const initials = ticker.slice(0, 2).toUpperCase();
  const fontSize = 200;
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="badgeGradient" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:${palette.accent};stop-opacity:0.8"/>
          <stop offset="100%" style="stop-color:${palette.bg};stop-opacity:1"/>
        </radialGradient>
        <filter id="badgeGlow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="${palette.bg}"/>
      
      <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.4}" 
              fill="url(#badgeGradient)" 
              stroke="${palette.accent}" 
              strokeWidth="8"
              filter="url(#badgeGlow)"/>
      
      <text x="50%" y="50%" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            text-anchor="middle" 
            dominant-baseline="middle"
            fill="${palette.fg}">
        ${initials}
      </text>
    </svg>
  `;
  
  const svgBuffer = Buffer.from(svg);
  
  const image = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  });
  
  const result = await image
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
    
  return result;
}

export async function composeLogoPixelMark(ticker: string, palette: Palette): Promise<Buffer> {
  const size = 1024;
  const initials = ticker.slice(0, 2).toUpperCase();
  const fontSize = 180;
  const pixelSize = 32;
  
  // Create pixel pattern based on ticker hash
  const hash = hashString(ticker);
  const pixels = [];
  
  for (let y = 0; y < size / pixelSize; y++) {
    for (let x = 0; x < size / pixelSize; x++) {
      const pixelHash = hashString(`${ticker}${x}${y}`);
      if (hashToRange(pixelHash, 100) < 30) { // 30% chance of pixel
        // Use accent2 for some pixels to add variety
        const useAccent2 = hashToRange(pixelHash >> 8, 100) < 40; // 40% chance of accent2
        const pixelColor = useAccent2 ? palette.accent2 : palette.accent;
        pixels.push(`<rect x="${x * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${pixelColor}" opacity="0.6"/>`);
      }
    }
  }
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="pixelGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="${palette.bg}"/>
      
      ${pixels.join('\n      ')}
      
      <text x="50%" y="50%" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            text-anchor="middle" 
            dominant-baseline="middle"
            fill="${palette.fg}"
            filter="url(#pixelGlow)">
        ${initials}
      </text>
    </svg>
  `;
  
  const svgBuffer = Buffer.from(svg);
  
  const image = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  });
  
  const result = await image
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
    
  return result;
}

// Generate QR code PNG
export async function makeQrPng(url: string): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  
  // Convert data URL to buffer
  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Generate hashtag pack based on chain, vibe, and ticker
export function generateHashtags(ticker: string, name: string, vibe: string): string[] {
  // Base hashtags for Solana meme coins
  const baseHashtags = ["#Solana", "#memecoin", "#crypto", "#degen", "#airdrop", "#pump"];
  
  // Derived hashtags from ticker and name
  const derivedHashtags = [
    `#${ticker}`,
    `#${name.replace(/\s+/g, '')}`,
    `#${ticker.toLowerCase()}`
  ];
  
  // Vibe-specific hashtags
  const vibeHashtags: string[] = [];
  const lowerVibe = vibe.toLowerCase();
  
  if (lowerVibe.includes('moon') || lowerVibe.includes('rocket')) {
    vibeHashtags.push("#moon", "#rocket", "#lambo");
  } else if (lowerVibe.includes('doge') || lowerVibe.includes('shib')) {
    vibeHashtags.push("#doge", "#shib", "#wojak");
  } else if (lowerVibe.includes('pepe') || lowerVibe.includes('frog')) {
    vibeHashtags.push("#pepe", "#frog", "#rare");
  } else if (lowerVibe.includes('cat') || lowerVibe.includes('kitty')) {
    vibeHashtags.push("#cat", "#kitty", "#meow");
  } else {
    // Default vibe hashtags
    vibeHashtags.push("#meme", "#token", "#community");
  }
  
  // Combine and return 8-12 hashtags
  const allHashtags = [...baseHashtags, ...derivedHashtags, ...vibeHashtags];
  return allHashtags.slice(0, Math.min(12, allHashtags.length));
}

// Generate posting schedule based on content and language
export function generateSchedule(
  threads: string[], 
  copypastas: string[], 
  lang: string = "en"
): { t: string; channel: string; type: string; ref: string }[] {
  const schedule = [];
  let hourOffset = 0;
  
  // Helper to get content reference
  const getContentRef = (type: string, index: number, lang: string) => {
    if (lang === "es") {
      return `content.es.${type}[${index}]`;
    }
    return `content.en.${type}[${index}]`;
  };
  
  // Add threads (spaced 4-6 hours apart)
  for (let i = 0; i < Math.min(3, threads.length); i++) {
    schedule.push({
      t: `+${hourOffset}h`,
      channel: "twitter",
      type: "thread",
      ref: getContentRef("threads", i, lang)
    });
    hourOffset += 4 + (i % 2); // 4-5 hours apart
  }
  
  // Add copypastas (spaced 3-4 hours apart)
  for (let i = 0; i < Math.min(4, copypastas.length); i++) {
    schedule.push({
      t: `+${hourOffset}h`,
      channel: "twitter",
      type: "copypastas",
      ref: getContentRef("copypastas", i, lang)
    });
    hourOffset += 3 + (i % 2); // 3-4 hours apart
  }
  
  // Add a final thread if we have more content
  if (threads.length > 3) {
    schedule.push({
      t: `+${hourOffset}h`,
      channel: "twitter",
      type: "thread",
      ref: getContentRef("threads", 3, lang)
    });
  }
  
  return schedule;
}

// Kit manifest interface
export interface KitManifest {
  name: string;
  ticker: string;
  vibe: string;
  preset: string;
  theme: Theme;
  palette: Palette;
  assets: {
    og: string;
    xHeader: string;
    tgHeader: string;
    favicon: string;
    qr: string;
         logos: {
       textMark: string;
       badgeMark: string;
       pixelMark: string;
       default: string;
     };
     stickers: string[];
  };
  content: {
    threads: string[];
    copypastas: string[];
    roadmap: string[];
    hashtags: string[];
  };
  schedule: {
    t: string;
    channel: string;
    type: string;
    ref: string;
  }[];
  links: {
    sharePage: string;
  };
}
