import { NextApiRequest, NextApiResponse } from "next";
import { paletteFromTicker, themeFromTicker, seededRng, composeHeader } from "../../../../lib/kitComposer";
import { hashString } from "../../../../lib/hash";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { ticker, filename } = req.query;
    const { name, vibe, preset } = req.query;

    if (!ticker || !filename || !name || !vibe || !preset) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Validate filename to prevent path traversal
    const allowedFilenames = ['og_1200x630.png', 'x_1500x500.png', 'tg_1920x1080.png'];
    if (!allowedFilenames.includes(filename as string)) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    // Generate the image based on the filename
    const palette = paletteFromTicker(ticker as string);
    const theme = themeFromTicker(ticker as string);
    
    // Create seeded RNG for deterministic randomness
    const seed = hashString(`${name}${ticker}${vibe}${preset}`);
    const rng = seededRng(seed);
    
    // Create badge text
    const badge = preset === 'honest' ? '✅ Honest Launch' : '⚡ Degen Mode';

    let imageBuffer: Buffer;

    switch (filename) {
      case 'og_1200x630.png':
        imageBuffer = await composeHeader({
          w: 1200,
          h: 630,
          text: name as string,
          subtext: `$${ticker}`,
          palette,
          badge,
          theme
        }, rng);
        break;
      
      case 'x_1500x500.png':
        imageBuffer = await composeHeader({
          w: 1500,
          h: 500,
          text: name as string,
          subtext: `$${ticker}`,
          palette,
          badge,
          theme
        }, rng);
        break;
      
      case 'tg_1920x1080.png':
        imageBuffer = await composeHeader({
          w: 1920,
          h: 1080,
          text: name as string,
          subtext: `$${ticker}`,
          palette,
          badge,
          theme
        }, rng);
        break;
      
      default:
        return res.status(400).json({ error: "Unsupported filename" });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Content-Length', imageBuffer.length);

    // Send the image
    res.send(imageBuffer);

  } catch (error) {
    console.error("Error generating kit image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
