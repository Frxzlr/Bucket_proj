/**
 * CacheService handles in-memory caching with Time-To-Live (TTL).
 * Default TTL is 1 minute (60,000 ms).
 */
class CacheService {
  constructor(defaultTtlMs = 60 * 1000) {
    this.defaultTtl = defaultTtlMs;
    // Map storing key -> { data, createdAt, ttl }
    this.store = new Map();
  }

  /**
   * Set a cache entry.
   * Stores the creation timestamp (createdAt).
   * @param {string} key
   * @param {*} data
   * @param {number} [ttl]
   */
  set(key, data, ttl = this.defaultTtl) {
    const createdAt = Date.now();
    this.store.set(key, {
      data,
      createdAt,
      ttl
    });
  }

  /**
   * Get a cache entry.
   * Checks if entry is older than TTL (1 minute).
   * If expired, removes entry and returns null.
   * @param {string} key
   * @returns {*|null}
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.createdAt;

    if (age > entry.ttl) {
      // Entry has expired - do not use cached value
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific cache key
   * @param {string} key
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Invalidate all cache entries that may contain stale data
   */
  invalidateAll() {
    this.store.clear();
  }

  /**
   * Get metadata of a cache entry (useful for inspection/debugging)
   * @param {string} key
   */
  getEntryMeta(key) {
    return this.store.get(key) || null;
  }

  /**
   * Current number of entries in the cache
   */
  size() {
    return this.store.size;
  }
}

// Export a singleton instance and class definition
const cacheInstance = new CacheService();
cacheInstance.CacheService = CacheService;

module.exports = cacheInstance;
