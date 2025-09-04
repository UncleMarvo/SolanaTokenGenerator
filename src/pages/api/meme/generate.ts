import { NextApiRequest, NextApiResponse } from "next";
import { generateMemeContent } from "../../../lib/memeTemplates";
import { generateHashtags, generateSchedule } from "../../../lib/kitComposer";

interface MemeKitRequest {
  name: string;
  ticker: string;
  vibe: "funny" | "serious" | "degen";
}

interface MemeKitResponse {
  logoUrl: string;
  twitterThreads: string[];
  copypastas: string[];
  roadmap: string[];
  hashtags: string[];
  schedule: {
    t: string;
    channel: string;
    type: string;
    ref: string;
  }[];
  isPro: boolean; // Added isPro to the interface
}

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Disallowed terms for safety
const DISALLOWED_TERMS = [
  'kill', 'murder', 'bomb', 'terror', 'hate', 'racist', 'nazi', 'hitler',
  'scam', 'fake', 'rug', 'ponzi', 'pyramid', 'illegal', 'drugs', 'weapon'
];

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

// Safety check function
function checkSafety(name: string, ticker: string): string | null {
  const text = `${name} ${ticker}`.toLowerCase();
  
  for (const term of DISALLOWED_TERMS) {
    if (text.includes(term)) {
      return `Content contains disallowed term: ${term}`;
    }
  }
  
  return null;
}

// AI generation function
async function generateWithAI(name: string, ticker: string, vibe: string): Promise<MemeKitResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const vibePrompts = {
    funny: "funny and humorous with lots of emojis and memes",
    serious: "professional and business-focused with technical terms",
    degen: "extremely hype and degen-style with rocket emojis and moon references"
  };

  const prompt = `Generate a meme kit for token "${name}" ($${ticker}) with ${vibePrompts[vibe as keyof typeof vibePrompts]} tone.

Return ONLY a JSON object with this exact structure:
{
  "twitterThreads": [
    "🧵 Thread 1 content here...",
    "🚀 Thread 2 content here..."
  ],
  "copypastas": [
    "Copypasta 1 here",
    "Copypasta 2 here"
  ],
  "roadmap": [
    "Step 1: Launch",
    "Step 2: Vibe", 
    "Step 3: Moon",
    "Step 4: Lambo"
  ]
}

Keep threads 6-8 lines each, copypastas short and punchy, roadmap 4 steps. Use emojis and hashtags appropriately.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a meme kit generator for Solana tokens. Generate engaging, appropriate content."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

         // Parse the JSON response (handle markdown formatting)
     let jsonContent = content.trim();
     
     // Remove markdown code blocks if present
     if (jsonContent.startsWith('```json')) {
       jsonContent = jsonContent.replace(/^```json\n/, '').replace(/\n```$/, '');
     } else if (jsonContent.startsWith('```')) {
       jsonContent = jsonContent.replace(/^```\n/, '').replace(/\n```$/, '');
     }
     
     const parsed = JSON.parse(jsonContent);
    
    // Generate hashtags and schedule
    const hashtags = generateHashtags(ticker, name, vibe);
    const schedule = generateSchedule(parsed.twitterThreads || [], parsed.copypastas || [], "en");
    
    return {
      logoUrl: "/brand/meme-placeholder.png",
      twitterThreads: parsed.twitterThreads || [],
      copypastas: parsed.copypastas || [],
      roadmap: parsed.roadmap || [],
      hashtags,
      schedule,
      isPro: false, // Default to false for AI generation
    };
  } catch (error) {
    console.error("AI generation error:", error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MemeKitResponse | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, ticker, vibe, wallet }: MemeKitRequest = req.body;

    if (!name || !ticker || !vibe) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Safety check
    const safetyError = checkSafety(name, ticker);
    if (safetyError) {
      return res.status(400).json({ error: safetyError });
    }

    // Rate limiting (using IP address)
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const identifier = Array.isArray(clientIP) ? clientIP[0] : clientIP;
    
    if (!checkRateLimit(identifier)) {
      return res.status(429).json({ error: "Rate limit exceeded. Try again in 10 minutes." });
    }

    // Check Pro status if wallet is provided
    const userIsPro = wallet ? await isPro(wallet) : false;
    console.log(`User Pro status for ${name} ($${ticker}): ${userIsPro ? 'PRO' : 'BASIC'}`);

    let response: MemeKitResponse;

    // Check if AI is enabled and API key exists
    if (process.env.MEME_AI === "on" && process.env.OPENAI_API_KEY) {
      try {
        response = await generateWithAI(name, ticker, vibe);
        response.isPro = userIsPro; // Add Pro status to AI response
      } catch (aiError) {
        console.error("AI generation failed, falling back to templates:", aiError);
        // Fallback to template generation
        const generatedContent = generateMemeContent(name, ticker, vibe);
        const hashtags = getHashtagsByProStatus(ticker, name, vibe, userIsPro);
        const schedule = getScheduleByProStatus(vibe, userIsPro);
        const enhancedContent = getEnhancedContentByProStatus(generatedContent, vibe, userIsPro);
        
        response = {
          logoUrl: userIsPro ? "/brand/meme-placeholder.png" : "/brand/meme-placeholder.png",
          twitterThreads: enhancedContent.twitterThreads,
          copypastas: enhancedContent.copypastas,
          roadmap: enhancedContent.roadmap,
          hashtags,
          schedule,
          isPro: userIsPro
        };
      }
    } else {
      // Use template-based generation
      const generatedContent = generateMemeContent(name, ticker, vibe);
      const hashtags = getHashtagsByProStatus(ticker, name, vibe, userIsPro);
      const schedule = getScheduleByProStatus(vibe, userIsPro);
      const enhancedContent = getEnhancedContentByProStatus(generatedContent, vibe, userIsPro);
      
      response = {
        logoUrl: userIsPro ? "/brand/meme-placeholder.png" : "/brand/meme-placeholder.png",
        twitterThreads: enhancedContent.twitterThreads,
        copypastas: enhancedContent.copypastas,
        roadmap: enhancedContent.roadmap,
        hashtags,
        schedule,
        isPro: userIsPro
      };
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error generating meme kit:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
