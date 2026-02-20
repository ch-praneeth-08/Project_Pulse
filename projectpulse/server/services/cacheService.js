/**
 * Cache Service
 * In-memory cache with TTL for repository data
 */

import NodeCache from 'node-cache';

// 5 minute TTL for repo data
const CACHE_TTL_SECONDS = 5 * 60;

// Create cache instance
const cache = new NodeCache({
  stdTTL: CACHE_TTL_SECONDS,
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: true  // Return cloned copies to prevent mutation
});

/**
 * Generate a cache key from a repo URL
 * Normalizes different URL formats to the same key
 */
function getCacheKey(repoUrl) {
  // Extract owner/repo from various formats
  const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
  const shortPattern = /^([^\/]+)\/([^\/]+)$/;

  let owner, repo;

  let match = repoUrl.match(urlPattern);
  if (match) {
    owner = match[1].toLowerCase();
    repo = match[2].replace(/\.git$/, '').toLowerCase();
  } else {
    match = repoUrl.trim().match(shortPattern);
    if (match) {
      owner = match[1].toLowerCase();
      repo = match[2].replace(/\.git$/, '').toLowerCase();
    }
  }

  if (!owner || !repo) {
    return repoUrl; // Fallback to raw URL
  }

  return `repo:${owner}/${repo}`;
}

/**
 * Get cached data for a repository
 * @param {string} repoUrl 
 * @returns {object|null}
 */
export function getCachedData(repoUrl) {
  const key = getCacheKey(repoUrl);
  const data = cache.get(key);
  
  if (data) {
    console.log(`Cache hit for ${key}`);
    return data;
  }
  
  console.log(`Cache miss for ${key}`);
  return null;
}

/**
 * Store data in cache
 * @param {string} repoUrl 
 * @param {object} data 
 */
export function setCachedData(repoUrl, data) {
  const key = getCacheKey(repoUrl);
  cache.set(key, data);
  console.log(`Cached data for ${key} (TTL: ${CACHE_TTL_SECONDS}s)`);
}

/**
 * Invalidate cache for a repository
 * @param {string} repoUrl 
 */
export function invalidateCache(repoUrl) {
  const key = getCacheKey(repoUrl);
  cache.del(key);
  console.log(`Invalidated cache for ${key}`);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return cache.getStats();
}

/**
 * Clear entire cache
 */
export function clearCache() {
  cache.flushAll();
  console.log('Cache cleared');
}

export default {
  getCachedData,
  setCachedData,
  invalidateCache,
  getCacheStats,
  clearCache
};
