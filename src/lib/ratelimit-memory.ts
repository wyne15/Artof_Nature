/** In-process limiter. Used for dev and as a fallback; production uses the database function. */
export class MemoryRateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  hit(key: string, max: number, windowSeconds: number, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      this.prune(now);
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  }

  private prune(now: number) {
    if (this.hits.size < 5000) return;
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}
