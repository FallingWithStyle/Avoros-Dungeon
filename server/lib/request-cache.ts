
/**
 * File: request-cache.ts
 * Responsibility: Provides request-level caching to prevent duplicate database calls within a single HTTP request
 * Notes: Uses WeakMap to ensure caches are garbage collected when requests complete
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly TTL = 30000; // 30 seconds TTL

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Create a cache key for database queries
  static createKey(type: string, ...params: (string | number)[]): string {
    return `${type}:${params.join(':')}`;
  }
}

// Global request cache instance - cleared between requests
const requestCaches = new WeakMap<any, RequestCache>();

export function getRequestCache(req: any): RequestCache {
  if (!requestCaches.has(req)) {
    requestCaches.set(req, new RequestCache());
  }
  return requestCaches.get(req)!;
}
