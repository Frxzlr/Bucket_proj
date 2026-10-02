const cacheService = require('../services/cache.service');

/**
 * Cache middleware for GET endpoints.
 * - Checks if cached data exists and is valid (within 1-minute TTL).
 * - If HIT: sets 'X-Cache: HIT' header and returns cached response immediately.
 * - If MISS: sets 'X-Cache: MISS' header, intercepts response to save fresh data in cache, and calls next().
 */
function cacheMiddleware(req, res, next) {
  // Caching is only applied to GET requests
  if (req.method !== 'GET') {
    return next();
  }

  // Use the full URL as the cache key (e.g. /products or /products/1)
  const cacheKey = req.originalUrl || req.url;
  const cachedData = cacheService.get(cacheKey);

  if (cachedData !== null) {
    // Cache HIT: set header and respond immediately
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cachedData);
  }

  // Cache MISS: set header
  res.setHeader('X-Cache', 'MISS');

  // Intercept res.json and res.send to capture and cache the fresh response body
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  let hasBeenCached = false;

  res.json = function (body) {
    if (!hasBeenCached && res.statusCode >= 200 && res.statusCode < 300) {
      cacheService.set(cacheKey, body);
      hasBeenCached = true;
    }
    return originalJson(body);
  };

  res.send = function (body) {
    if (!hasBeenCached && res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        cacheService.set(cacheKey, parsed);
        hasBeenCached = true;
      } catch {
        cacheService.set(cacheKey, body);
        hasBeenCached = true;
      }
    }
    return originalSend(body);
  };

  next();
}

module.exports = cacheMiddleware;
