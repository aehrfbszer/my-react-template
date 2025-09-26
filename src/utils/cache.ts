interface CacheItem<T> {
  data: T;
  expires: number;
}

export class RequestCache {
  #cache = new Map<string, CacheItem<unknown>>();
  readonly #capacity: number;
  readonly #defaultTTL: number;

  constructor(capacity = 100, defaultTTL = 5 * 60 * 1000) {
    this.#capacity = capacity;
    this.#defaultTTL = defaultTTL;
  }

  set<T>(key: string, value: T, ttl = this.#defaultTTL): void {
    this.#cleanup();

    if (this.#cache.size >= this.#capacity) {
      const [firstKey] = this.#cache.keys();
      this.#cache.delete(firstKey);
    }

    this.#cache.set(key, {
      data: value,
      expires: Date.now() + ttl,
    });
  }

  get<T>(key: string): T | undefined {
    const item = this.#cache.get(key);

    if (!item) return undefined;

    if (Date.now() > item.expires) {
      this.#cache.delete(key);
      return undefined;
    }

    return item.data as T;
  }

  #cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.#cache.entries()) {
      if (now > item.expires) {
        this.#cache.delete(key);
      }
    }
  }

  clear(): void {
    this.#cache.clear();
  }
}
