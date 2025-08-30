import { NextApiRequest, NextApiResponse } from "next";

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
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<MemeKitResponse | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, ticker, vibe }: MemeKitRequest = req.body;

    if (!name || !ticker || !vibe) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Mock response based on vibe
    const mockResponse: MemeKitResponse = {
      logoUrl: "/brand/meme-placeholder.png",
      twitterThreads: generateTwitterThreads(ticker, vibe),
      copypastas: generateCopypastas(ticker, vibe),
      roadmap: generateRoadmap(vibe),
    };

    res.status(200).json(mockResponse);
  } catch (error) {
    console.error("Error generating meme kit:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

function generateTwitterThreads(ticker: string, vibe: string): string[] {
  const threads = {
    funny: [
      `🧵 Why $${ticker} is the most hilarious token you'll ever buy:\n\n1. It's so funny, even your wallet will laugh\n2. The memes write themselves\n3. Your friends will think you're a genius\n4. The only thing funnier than the price is the community\n\n#${ticker} #Solana #Memes`,
      `😂 The $${ticker} story in 3 tweets:\n\n1. "This will never work"\n2. "Maybe it will work"\n3. "I can't believe it worked"\n\n#${ticker} #Solana #Crypto`
    ],
    serious: [
      `📊 $${ticker} Token Analysis:\n\n• Strong fundamentals\n• Experienced team\n• Clear roadmap\n• Growing community\n• Real utility\n\nThis is not financial advice. #${ticker} #Solana`,
      `🔍 Deep dive into $${ticker}:\n\nMarket cap: Growing\nLiquidity: Strong\nCommunity: Active\nDevelopment: Ongoing\n\nSolid project with real potential. #${ticker} #Solana`
    ],
    degen: [
      `🚀 $${ticker} APE IN NOW OR MISS OUT FOREVER:\n\n• 1000x potential\n• Next moon mission\n• Early gem alert\n• Don't be poor\n• DYOR but ape anyway\n\n#${ticker} #Solana #Moon`,
      `💎 $${ticker} DIAMOND HANDS ONLY:\n\n• Paper hands not welcome\n• HODL to the moon\n• This is the way\n• Trust the process\n• We're all gonna make it\n\n#${ticker} #Solana #WAGMI`
    ]
  };

  return threads[vibe as keyof typeof threads] || threads.degen;
}

function generateCopypastas(ticker: string, vibe: string): string[] {
  const copypastas = {
    funny: [
      `BUY $${ticker} OR STAY BROKE 🚀`,
      `$${ticker} is so good, even my cat wants to invest 😸`,
      `I sold my kidney for $${ticker} and I don't regret it 💎`
    ],
    serious: [
      `$${ticker} represents the future of decentralized finance.`,
      `Investing in $${ticker} is investing in innovation.`,
      `$${ticker} - Building the future, one block at a time.`
    ],
    degen: [
      `$${ticker} OR STAY POOR FOREVER 🚀💎`,
      `APE INTO $${ticker} NOW BEFORE IT'S TOO LATE 🔥`,
      `$${ticker} IS THE NEXT 1000X GEM 💎💎💎`
    ]
  };

  return copypastas[vibe as keyof typeof copypastas] || copypastas.degen;
}

function generateRoadmap(vibe: string): string[] {
  const roadmaps = {
    funny: [
      "Step 1: Launch with a bang",
      "Step 2: Make everyone laugh",
      "Step 3: Moon (because why not?)",
      "Step 4: Profit and memes"
    ],
    serious: [
      "Phase 1: Platform Development",
      "Phase 2: Community Building",
      "Phase 3: Partnership Expansion",
      "Phase 4: Ecosystem Growth"
    ],
    degen: [
      "Step 1: Launch",
      "Step 2: Vibe",
      "Step 3: Moon",
      "Step 4: Lambo"
    ]
  };

  return roadmaps[vibe as keyof typeof roadmaps] || roadmaps.degen;
}
