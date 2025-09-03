/**
 * Share URL helper with UTM tracking parameters
 * Generates URLs with proper UTM source and medium for analytics tracking
 */

export function shareUrl(baseHref: string, source: "x" | "tg" | "copy"): string {
  const u = new URL(baseHref);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", "share");
  return u.toString();
}

/**
 * Generate default tweet text for token sharing
 */
export function getDefaultTweetText(name: string, ticker: string): string {
  return `${name} ($${ticker}) live now on Solana.`;
}

/**
 * Generate social media share URLs
 */
export function getSocialShareUrls(baseHref: string, name: string, ticker: string) {
  const tweetText = getDefaultTweetText(name, ticker);
  const shareUrlX = shareUrl(baseHref, "x");
  const shareUrlTg = shareUrl(baseHref, "tg");
  const shareUrlCopy = shareUrl(baseHref, "copy");

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrlX)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrlTg)}&text=${encodeURIComponent(tweetText)}`,
    copy: shareUrlCopy
  };
}
