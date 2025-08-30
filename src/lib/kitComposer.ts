import sharp from 'sharp';
import QRCode from 'qrcode';
import { hashString, hashToRange, hslToHex } from './hash';

// Types
export interface Palette {
  bg: string;
  fg: string;
  accent: string;
}

export interface ComposeOptions {
  w: number;
  h: number;
  text: string;
  subtext?: string;
  palette: Palette;
  badge?: string;
}

export interface FaviconOptions {
  ticker: string;
  palette: Palette;
}

// Degen Neon fallback palette
const DEGEN_NEON_PALETTE: Palette = {
  bg: '#0F1115',
  fg: '#E6F1FF',
  accent: '#8AFFEF'
};

// Generate deterministic palette from ticker
export function paletteFromTicker(ticker: string): Palette {
  const hash = hashString(ticker);
  
  // Generate base colors
  const hue1 = hashToRange(hash, 360);
  const hue2 = (hue1 + 180) % 360; // Complementary
  const hue3 = (hue1 + 120) % 360; // Triadic
  
  const saturation = 70 + hashToRange(hash >> 8, 30); // 70-100%
  const lightness = 45 + hashToRange(hash >> 16, 20); // 45-65%
  
  // Convert to hex
  const bg = hslToHex(hue1, saturation, 15); // Dark background
  const fg = hslToHex(hue2, saturation, 90); // Light foreground
  const accent = hslToHex(hue3, saturation, lightness); // Accent color
  
  return { bg, fg, accent };
}

// Create SVG text overlay
function createTextSVG(options: ComposeOptions): string {
  const { w, h, text, subtext, palette, badge } = options;
  
  const fontSize = Math.min(w / 15, 48);
  const subFontSize = Math.min(w / 25, 24);
  const badgeFontSize = Math.min(w / 30, 18);
  
  const textY = h / 2 - (subtext ? fontSize / 2 : 0);
  const subtextY = h / 2 + fontSize / 2;
  const badgeY = h - 40;
  
  return `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${palette.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${palette.accent};stop-opacity:0.3" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#bgGradient)"/>
      
      <text x="50%" y="${textY}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            text-anchor="middle" 
            fill="${palette.fg}"
            filter="url(#glow)">
        ${text}
      </text>
      
      ${subtext ? `
        <text x="50%" y="${subtextY}" 
              font-family="Arial, sans-serif" 
              font-size="${subFontSize}" 
              text-anchor="middle" 
              fill="${palette.accent}"
              opacity="0.8">
          ${subtext}
        </text>
      ` : ''}
      
      ${badge ? `
        <text x="50%" y="${badgeY}" 
              font-family="Arial, sans-serif" 
              font-size="${badgeFontSize}" 
              text-anchor="middle" 
              fill="${palette.accent}"
              filter="url(#glow)">
          ${badge}
        </text>
      ` : ''}
    </svg>
  `;
}

// Compose header image
export async function composeHeader(options: ComposeOptions): Promise<Buffer> {
  const { w, h } = options;
  
  // Create SVG overlay
  const svg = createTextSVG(options);
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

// Kit manifest interface
export interface KitManifest {
  name: string;
  ticker: string;
  vibe: string;
  preset: string;
  palette: Palette;
  assets: {
    og: string;
    xHeader: string;
    tgHeader: string;
    favicon: string;
    qr: string;
  };
  content: {
    threads: string[];
    copypastas: string[];
    roadmap: string[];
  };
  links: {
    sharePage: string;
  };
}
