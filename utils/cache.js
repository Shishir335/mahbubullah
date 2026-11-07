// Simple, high-performance in-memory cache for server-side responses
class MemoryCache {
    constructor() {
        this.cache = new Map();
    }

    set(key, value, ttlSeconds = 300) {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.cache.set(key, { value, expiresAt });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }

    del(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    invalidatePrefix(prefix) {
        this.cache.forEach((_, key) => {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        });
    }
}

const memoryCache = new MemoryCache();
module.exports = memoryCache;

