import { SeededRandom } from "./memeTemplates";

// Pro-exclusive premium hashtag packs
export const proHashtagPacks = {
  funny: [
    '#Solana', '#Memes', '#Crypto', '#DeFi', '#Moon', '#Lambo', '#DiamondHands', '#HODL', '#WAGMI', '#FOMO',
    '#MemeSeason', '#Pepe', '#Doge', '#Shiba', '#Bonk', '#Jupiter', '#Raydium', '#Orca', '#Phantom', '#Solflare',
    '#SolanaEco', '#NFTs', '#Gaming', '#Metaverse', '#Web3', '#Blockchain', '#Innovation', '#Community', '#Alpha', '#Gem'
  ],
  serious: [
    '#Solana', '#Blockchain', '#DeFi', '#Innovation', '#Technology', '#Future', '#Finance', '#Investment', '#Growth', '#Development',
    '#SolanaEcosystem', '#SmartContracts', '#DApps', '#DeFiProtocols', '#Liquidity', '#YieldFarming', '#Staking', '#Governance', '#DAO', '#Tokenomics',
    '#Partnerships', '#Enterprise', '#Institutional', '#Regulation', '#Compliance', '#Security', '#Scalability', '#Performance', '#Sustainability', '#Vision'
  ],
  degen: [
    '#Solana', '#Moon', '#Lambo', '#DiamondHands', '#ApeIn', '#WAGMI', '#FOMO', '#YOLO', '#SendIt', '#Rocket',
    '#PumpIt', '#ToTheMoon', '#Mars', '#Galaxy', '#Universe', '#Infinity', '#Beyond', '#Legendary', '#Epic', '#Insane',
    '#Crazy', '#Wild', '#Fire', '#Explosion', '#Nuclear', '#Atomic', '#Supernova', '#BlackHole', '#Wormhole', '#TimeTravel'
  ]
};

// Basic hashtag packs for non-Pro users
export const basicHashtagPacks = {
  funny: ['#Solana', '#Memes', '#Crypto', '#DeFi', '#Moon', '#Lambo', '#DiamondHands', '#HODL', '#WAGMI', '#FOMO'],
  serious: ['#Solana', '#Blockchain', '#DeFi', '#Innovation', '#Technology', '#Future', '#Finance', '#Investment', '#Growth', '#Development'],
  degen: ['#Solana', '#Moon', '#Lambo', '#DiamondHands', '#ApeIn', '#WAGMI', '#FOMO', '#YOLO', '#SendIt', '#Rocket']
};

// Pro-exclusive premium schedule templates
export const proScheduleTemplates = {
  funny: [
    { t: "+0h", channel: "Twitter", type: "Launch Thread", ref: "Thread 1: The most hilarious token launch ever" },
    { t: "+2h", channel: "Discord", type: "Community Call", ref: "Voice chat: Share your funniest memes" },
    { t: "+4h", channel: "Twitter", type: "Meme Contest", ref: "Thread 2: Post your best $TICKER memes" },
    { t: "+6h", channel: "Telegram", type: "Copypasta Spam", ref: "Share the best copypastas" },
    { t: "+8h", channel: "Twitter", type: "Community Spotlight", ref: "Thread 3: Highlight amazing community members" },
    { t: "+12h", channel: "Discord", type: "Gaming Night", ref: "Play games together in voice chat" },
    { t: "+18h", channel: "Twitter", type: "Daily Wrap", ref: "Thread 4: What we accomplished today" },
    { t: "+24h", channel: "All", type: "Weekend Plans", ref: "Plan activities for the weekend" }
  ],
  serious: [
    { t: "+0h", channel: "Twitter", type: "Project Launch", ref: "Thread 1: Introducing our vision and roadmap" },
    { t: "+2h", channel: "Discord", type: "Technical AMA", ref: "Q&A with the development team" },
    { t: "+4h", channel: "Medium", type: "Whitepaper", ref: "Detailed technical documentation" },
    { t: "+6h", channel: "Twitter", type: "Partnership", ref: "Thread 2: Strategic partnerships announced" },
    { t: "+8h", channel: "LinkedIn", type: "Professional", ref: "Business development updates" },
    { t: "+12h", channel: "Discord", type: "Community", ref: "Community governance discussion" },
    { t: "+18h", channel: "Twitter", type: "Progress", ref: "Thread 3: Development milestones achieved" },
    { t: "+24h", channel: "All", type: "Weekly Review", ref: "Comprehensive project update" }
  ],
  degen: [
    { t: "+0h", channel: "Twitter", type: "APE IN", ref: "Thread 1: The most insane token launch ever" },
    { t: "+1h", channel: "Discord", type: "Voice Chat", ref: "Screaming and celebrating together" },
    { t: "+2h", channel: "Twitter", type: "MOON MISSION", ref: "Thread 2: We're going to Mars" },
    { t: "+3h", channel: "Telegram", ref: "Spam", ref: "Maximum copypasta energy" },
    { t: "+4h", channel: "Discord", type: "Gaming", ref: "Play while we moon" },
    { t: "+6h", channel: "Twitter", type: "ROCKET", ref: "Thread 3: Blast off sequence initiated" },
    { t: "+8h", channel: "All", type: "CELEBRATION", ref: "Party mode activated" },
    { t: "+12h", channel: "Twitter", type: "LAMBO", ref: "Thread 4: Planning our car collection" }
  ]
};

// Basic schedule templates for non-Pro users
export const basicScheduleTemplates = {
  funny: [
    { t: "+0h", channel: "Twitter", type: "Launch", ref: "Basic launch announcement" },
    { t: "+4h", channel: "Twitter", type: "Update", ref: "Community update" },
    { t: "+8h", channel: "Twitter", type: "Wrap", ref: "Daily summary" }
  ],
  serious: [
    { t: "+0h", channel: "Twitter", type: "Launch", ref: "Project introduction" },
    { t: "+6h", channel: "Twitter", type: "Update", ref: "Progress update" },
    { t: "+12h", channel: "Twitter", type: "Review", ref: "Daily summary" }
  ],
  degen: [
    { t: "+0h", channel: "Twitter", type: "Launch", ref: "APE IN NOW" },
    { t: "+4h", channel: "Twitter", type: "Update", ref: "MOON UPDATE" },
    { t: "+8h", channel: "Twitter", type: "Wrap", ref: "ROCKET STATUS" }
  ]
};

// Pro-exclusive premium content templates
export const proContentTemplates = {
  funny: {
    additionalThreads: [
      "🎭 The $TICKER community is so funny, even our charts laugh",
      "🤡 We're not just a token, we're a comedy show",
      "🎪 Every transaction is a punchline waiting to happen"
    ],
    additionalCopypastas: [
      "I bought $TICKER because the memes are worth more than the token",
      "This community is so funny, I'm crying tears of joy and SOL",
      "The only thing funnier than $TICKER is my portfolio"
    ]
  },
  serious: {
    additionalThreads: [
      "📊 $TICKER represents the future of decentralized finance",
      "🔬 Our technology is backed by cutting-edge research",
      "🌐 Building bridges between traditional and DeFi worlds"
    ],
    additionalCopypastas: [
      "Investing in $TICKER is investing in the future of finance",
      "The technology behind $TICKER is revolutionary",
      "Join us in building the next generation of DeFi"
    ]
  },
  degen: {
    additionalThreads: [
      "🚀 $TICKER is going to break the speed of light",
      "💎 Diamond hands are made of pure diamond",
      "🌙 We're not stopping at the moon, we're going to Andromeda"
    ],
    additionalCopypastas: [
      "APE INTO $TICKER OR MISS THE ROCKET",
      "DIAMOND HANDS UNTIL LAMBO",
      "WAGMI OR NGMI, THERE'S NO IN BETWEEN"
    ]
  }
};

// Basic content templates for non-Pro users
export const basicContentTemplates = {
  funny: {
    additionalThreads: [],
    additionalCopypastas: []
  },
  serious: {
    additionalThreads: [],
    additionalCopypastas: []
  },
  degen: {
    additionalThreads: [],
    additionalCopypastas: []
  }
};

/**
 * Get hashtags based on Pro status
 * @param ticker - Token ticker
 * @param name - Token name
 * @param vibe - Content vibe
 * @param isPro - Whether user has Pro access
 * @returns Array of hashtags
 */
export function getHashtagsByProStatus(
  ticker: string, 
  name: string, 
  vibe: string, 
  isPro: boolean
): string[] {
  const baseHashtags = isPro ? proHashtagPacks[vibe as keyof typeof proHashtagPacks] : basicHashtagPacks[vibe as keyof typeof basicHashtagPacks];
  
  // Add some dynamic hashtags based on ticker and name
  const dynamicHashtags = [
    `#${ticker}`,
    `#${name.replace(/\s+/g, '')}`,
    `#Solana${ticker}`,
    `#${ticker}Moon`
  ];
  
  return [...baseHashtags, ...dynamicHashtags];
}

/**
 * Get schedule based on Pro status
 * @param vibe - Content vibe
 * @param isPro - Whether user has Pro access
 * @returns Array of schedule items
 */
export function getScheduleByProStatus(
  vibe: string, 
  isPro: boolean
): Array<{ t: string; channel: string; type: string; ref: string }> {
  return isPro 
    ? proScheduleTemplates[vibe as keyof typeof proScheduleTemplates] 
    : basicScheduleTemplates[vibe as keyof typeof basicScheduleTemplates];
}

/**
 * Get enhanced content based on Pro status
 * @param baseContent - Base content from templates
 * @param vibe - Content vibe
 * @param isPro - Whether user has Pro access
 * @returns Enhanced content object
 */
export function getEnhancedContentByProStatus(
  baseContent: any,
  vibe: string,
  isPro: boolean
) {
  if (!isPro) {
    return baseContent;
  }

  const proTemplates = proContentTemplates[vibe as keyof typeof proContentTemplates];
  
  return {
    ...baseContent,
    twitterThreads: [
      ...baseContent.twitterThreads,
      ...proTemplates.additionalThreads
    ],
    copypastas: [
      ...baseContent.copypastas,
      ...proTemplates.additionalCopypastas
    ]
  };
}
