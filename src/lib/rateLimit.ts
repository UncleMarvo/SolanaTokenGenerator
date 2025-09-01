import { NextApiRequest } from 'next';

// Get client IP from request headers or fallback
export function getClientIp(req: NextApiRequest): string {
  // Check x-forwarded-for header (first IP in chain)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }
  
  // Check x-real-ip header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  
  // Fallback to localhost
  return '127.0.0.1';
}

// Get current UTC day in YYYY-MM-DD format
export function currentUtcDay(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Token bucket rate limiter interface
export interface RateLimiter {
  take(ip: string): boolean;
}

// Daily gate interface
export interface DailyGate {
  take(): boolean;
  stats(): { day: string; count: number };
}

// Create a token bucket rate limiter
export function makeBucket({ limit, windowMs }: { limit: number; windowMs: number }): RateLimiter {
  // Store timestamps for each IP
  const buckets = new Map<string, number[]>();
  
  return {
    take(ip: string): boolean {
      const now = Date.now();
      const cutoff = now - windowMs;
      
      // Get or create timestamp array for this IP
      let timestamps = buckets.get(ip);
      if (!timestamps) {
        timestamps = [];
        buckets.set(ip, timestamps);
      }
      
      // Remove timestamps older than window
      const validTimestamps = timestamps.filter(timestamp => timestamp > cutoff);
      
      // Check if we have capacity
      if (validTimestamps.length >= limit) {
        return false; // Rate limited
      }
      
      // Add current timestamp and update bucket
      validTimestamps.push(now);
      buckets.set(ip, validTimestamps);
      
      return true; // Allowed
    }
  };
}

// Create a daily gate for global usage limits
export function makeDailyGate(getMax: () => number): DailyGate {
  let day = currentUtcDay(); // "YYYY-MM-DD"
  let count = 0;
  
  return {
    take(): boolean {
      const today = currentUtcDay();
      if (today !== day) {
        day = today;
        count = 0;
      }
      const max = getMax();
      if (!max || count >= max) return false;
      count += 1;
      return true;
    },
    stats() {
      return { day, count };
    }
  };
}
