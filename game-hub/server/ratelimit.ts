/** Fixed-window request limiter, kept in memory. */
export class RateLimiter {
  private hits = new Map<string, { n: number; reset: number }>();
  constructor(private limit: number, private windowMs: number, private now: () => number) {}

  /** Returns false once `key` went over the limit in the current window. */
  hit(key: string): boolean {
    const t = this.now();
    const h = this.hits.get(key);
    if (!h || t >= h.reset) { this.hits.set(key, { n: 1, reset: t + this.windowMs }); return true; }
    h.n++;
    return h.n <= this.limit;
  }

  prune() {
    const t = this.now();
    for (const [k, h] of this.hits) if (t >= h.reset) this.hits.delete(k);
  }
}
