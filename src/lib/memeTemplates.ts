// Seeded PRNG for reproducible results
class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    this.seed = this.hashCode(seed);
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// Helper functions
export const randomFrom = <T>(list: T[], rng: SeededRandom): T => {
  return list[Math.floor(rng.next() * list.length)];
};

export const pickMany = <T>(list: T[], n: number, rng: SeededRandom): T[] => {
  const shuffled = [...list].sort(() => rng.next() - 0.5);
  return shuffled.slice(0, n);
};

export const hashtagify = (text: string): string => {
  return text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

// Content templates by vibe
export const memeContent = {
  funny: {
    emojis: ['😂', '🤣', '😭', '💀', '🔥', '🚀', '💎', '👀', '🤡', '🎭', '🎪', '🎯', '🎲', '🎮', '🍕', '🌮', '🍦', '🎂'],
    hashtags: ['#Solana', '#Memes', '#Crypto', '#DeFi', '#Moon', '#Lambo', '#DiamondHands', '#HODL', '#WAGMI', '#FOMO'],
    slang: ['ape in', 'diamond hands', 'paper hands', 'moon mission', 'lambo time', 'wen moon', 'ser', 'anons', 'wagmi', 'ngmi'],
    ctas: ['LFG!', 'WAGMI!', 'To the moon!', 'Diamond hands!', 'Ape in now!', 'Don\'t miss out!', 'Trust the process!'],
    roadmapSteps: [
      'Step 1: Launch with maximum chaos',
      'Step 2: Confuse everyone with memes',
      'Step 3: Accidentally moon',
      'Step 4: Profit (somehow)'
    ]
  },
  serious: {
    emojis: ['📊', '📈', '💼', '🎯', '🏆', '⭐', '🌟', '💫', '🔮', '📋', '📝', '📚', '🎓', '💡', '🔬', '⚡', '🌐', '🔗'],
    hashtags: ['#Solana', '#Blockchain', '#DeFi', '#Innovation', '#Technology', '#Future', '#Finance', '#Investment', '#Growth', '#Development'],
    slang: ['fundamentals', 'utility', 'innovation', 'ecosystem', 'partnership', 'development', 'roadmap', 'milestone', 'achievement', 'progress'],
    ctas: ['Join the revolution!', 'Build the future!', 'Innovate with us!', 'Grow together!', 'Invest in innovation!'],
    roadmapSteps: [
      'Phase 1: Platform Development',
      'Phase 2: Community Building',
      'Phase 3: Partnership Expansion',
      'Phase 4: Ecosystem Growth'
    ]
  },
  degen: {
    emojis: ['🚀', '💎', '🔥', '⚡', '💥', '🎯', '🎪', '🎭', '🎲', '🎰', '💰', '💸', '🤑', '🏆', '👑', '💪', '🤘', '🎸'],
    hashtags: ['#Solana', '#Moon', '#Lambo', '#DiamondHands', '#ApeIn', '#WAGMI', '#FOMO', '#YOLO', '#SendIt', '#Rocket'],
    slang: ['ape in', 'diamond hands', 'paper hands', 'moon mission', 'lambo time', 'wen moon', 'ser', 'anons', 'wagmi', 'ngmi', 'send it', 'rocket', 'blast off'],
    ctas: ['APE IN NOW!', 'DIAMOND HANDS!', 'TO THE MOON!', 'WAGMI!', 'SEND IT!', 'ROCKET TIME!', 'BLAST OFF!'],
    roadmapSteps: [
      'Step 1: Launch',
      'Step 2: Vibe',
      'Step 3: Moon',
      'Step 4: Lambo'
    ]
  }
};

// Thread templates
const threadTemplates = {
  funny: [
    (name: string, ticker: string, content: typeof memeContent.funny, rng: SeededRandom) => [
      `🧵 Why $${ticker} is the most hilarious token you'll ever buy:`,
      '',
      `1. It's so funny, even your wallet will laugh ${randomFrom(content.emojis, rng)}`,
      `2. The memes write themselves ${randomFrom(content.emojis, rng)}`,
      `3. Your friends will think you're a genius ${randomFrom(content.emojis, rng)}`,
      `4. The only thing funnier than the price is the community ${randomFrom(content.emojis, rng)}`,
      '',
      `${randomFrom(content.ctas, rng)} ${randomFrom(content.hashtags, rng)} ${randomFrom(content.hashtags, rng)}`
    ],
    (name: string, ticker: string, content: typeof memeContent.funny, rng: SeededRandom) => [
      `😂 The $${ticker} story in 3 tweets:`,
      '',
      `1. "This will never work" ${randomFrom(content.emojis, rng)}`,
      `2. "Maybe it will work" ${randomFrom(content.emojis, rng)}`,
      `3. "I can't believe it worked" ${randomFrom(content.emojis, rng)}`,
      '',
      `${randomFrom(content.ctas, rng)} ${randomFrom(content.hashtags, rng)}`
    ]
  ],
  serious: [
    (name: string, ticker: string, content: typeof memeContent.serious, rng: SeededRandom) => [
      `📊 $${ticker} Token Analysis:`,
      '',
      `• Strong ${randomFrom(content.slang, rng)}`,
      `• Experienced team`,
      `• Clear ${randomFrom(content.slang, rng)}`,
      `• Growing community`,
      `• Real ${randomFrom(content.slang, rng)}`,
      '',
      `This is not financial advice. ${randomFrom(content.hashtags, rng)} ${randomFrom(content.hashtags, rng)}`
    ],
    (name: string, ticker: string, content: typeof memeContent.serious, rng: SeededRandom) => [
      `🔍 Deep dive into $${ticker}:`,
      '',
      `Market cap: Growing`,
      `${randomFrom(content.slang, rng)}: Strong`,
      `Community: Active`,
      `${randomFrom(content.slang, rng)}: Ongoing`,
      '',
      `Solid project with real potential. ${randomFrom(content.hashtags, rng)} ${randomFrom(content.hashtags, rng)}`
    ]
  ],
  degen: [
    (name: string, ticker: string, content: typeof memeContent.degen, rng: SeededRandom) => [
      `🚀 $${ticker} APE IN NOW OR MISS OUT FOREVER:`,
      '',
      `• 1000x potential ${randomFrom(content.emojis, rng)}`,
      `• Next ${randomFrom(content.slang, rng)}`,
      `• Early gem alert ${randomFrom(content.emojis, rng)}`,
      `• Don't be poor`,
      `• DYOR but ${randomFrom(content.slang, rng)} anyway`,
      '',
      `${randomFrom(content.ctas, rng)} ${randomFrom(content.hashtags, rng)} ${randomFrom(content.hashtags, rng)}`
    ],
    (name: string, ticker: string, content: typeof memeContent.degen, rng: SeededRandom) => [
      `💎 $${ticker} DIAMOND HANDS ONLY:`,
      '',
      `• Paper hands not welcome ${randomFrom(content.emojis, rng)}`,
      `• ${randomFrom(content.slang, rng)} to the moon`,
      `• This is the way ${randomFrom(content.emojis, rng)}`,
      `• Trust the process`,
      `• We're all gonna make it ${randomFrom(content.emojis, rng)}`,
      '',
      `${randomFrom(content.ctas, rng)} ${randomFrom(content.hashtags, rng)} ${randomFrom(content.hashtags, rng)}`
    ]
  ]
};

// Copypasta templates
const copypastaTemplates = {
  funny: [
    (name: string, ticker: string, content: typeof memeContent.funny, rng: SeededRandom) => 
      `BUY $${ticker} OR STAY BROKE ${randomFrom(content.emojis, rng)}`,
    (name: string, ticker: string, content: typeof memeContent.funny, rng: SeededRandom) => 
      `$${ticker} is so good, even my cat wants to ${randomFrom(content.slang, rng)} ${randomFrom(content.emojis, rng)}`,
    (name: string, ticker: string, content: typeof memeContent.funny, rng: SeededRandom) => 
      `I sold my kidney for $${ticker} and I don't regret it ${randomFrom(content.emojis, rng)}`
  ],
  serious: [
    (name: string, ticker: string, content: typeof memeContent.serious, rng: SeededRandom) => 
      `$${ticker} represents the future of ${randomFrom(content.slang, rng)}.`,
    (name: string, ticker: string, content: typeof memeContent.serious, rng: SeededRandom) => 
      `Investing in $${ticker} is investing in ${randomFrom(content.slang, rng)}.`,
    (name: string, ticker: string, content: typeof memeContent.serious, rng: SeededRandom) => 
      `$${ticker} - Building the future, one ${randomFrom(content.slang, rng)} at a time.`
  ],
  degen: [
    (name: string, ticker: string, content: typeof memeContent.degen, rng: SeededRandom) => 
      `$${ticker} OR STAY POOR FOREVER ${randomFrom(content.emojis, rng)}${randomFrom(content.emojis, rng)}`,
    (name: string, ticker: string, content: typeof memeContent.degen, rng: SeededRandom) => 
      `APE INTO $${ticker} NOW BEFORE IT'S TOO LATE ${randomFrom(content.emojis, rng)}`,
    (name: string, ticker: string, content: typeof memeContent.degen, rng: SeededRandom) => 
      `$${ticker} IS THE NEXT 1000X GEM ${randomFrom(content.emojis, rng)}${randomFrom(content.emojis, rng)}${randomFrom(content.emojis, rng)}`
  ]
};

// Main generator function
export const generateMemeContent = (name: string, ticker: string, vibe: 'funny' | 'serious' | 'degen') => {
  const rng = new SeededRandom(ticker);
  const content = memeContent[vibe];
  const threadTemplatesForVibe = threadTemplates[vibe];
  const copypastaTemplatesForVibe = copypastaTemplates[vibe];

  // Generate threads
  const twitterThreads = threadTemplatesForVibe.map(template => 
    template(name, ticker, content, rng).join('\n')
  );

  // Generate copypastas
  const copypastas = pickMany(copypastaTemplatesForVibe, 3, rng).map(template => 
    template(name, ticker, content, rng)
  );

  // Generate roadmap
  const roadmap = content.roadmapSteps;

  return {
    twitterThreads,
    copypastas,
    roadmap
  };
};
