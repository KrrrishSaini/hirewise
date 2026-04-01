// lib/api.js
import { API_BASE } from './config';

/**
 * Fetch with retry logic and exponential backoff
 * Handles Render cold starts and network failures
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`Fetch attempt ${i + 1} failed:`, error.message);
      
      // Don't retry on abort or if it's the last attempt
      if (error.name === 'AbortError' || i === maxRetries - 1) {
        break;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.min(1000 * Math.pow(2, i), 4000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * API client with caching and retry logic
 */
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.cache = new Map();
    this.cacheTTL = 2 * 60 * 1000; // 2 minutes client-side cache
  }

  /**
   * Get from cache or fetch
   */
  async get(endpoint, options = {}) {
    const cacheKey = `${endpoint}${options.query ? '?' + new URLSearchParams(options.query) : ''}`;
    
    // Check cache
    if (!options.skipCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() < cached.expiry) {
        console.log('📦 Cache HIT:', cacheKey);
        return cached.data;
      }
    }

    // Fetch
    const url = `${this.baseURL}${endpoint}${options.query ? '?' + new URLSearchParams(options.query) : ''}`;
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }, options.retries || 3);

    const data = await response.json();

    // Cache successful GET requests
    if (!options.skipCache) {
      this.cache.set(cacheKey, {
        data,
        expiry: Date.now() + this.cacheTTL,
      });
    }

    return data;
  }

  /**
   * POST request (no caching)
   */
  async post(endpoint, body, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body instanceof FormData ? body : JSON.stringify(body),
    }, options.retries || 2);

    return response.json();
  }

  /**
   * PUT request
   */
  async put(endpoint, body, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetchWithRetry(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
    }, options.retries || 2);

    return response.json();
  }

  /**
   * Clear cache
   */
  clearCache(pattern) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE);

const normalizeCandidatesList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.applications)) return payload.applications;
    if (Array.isArray(payload.candidates)) return payload.candidates;
  }
  return [];
};

// Export helper functions for common endpoints
export const candidatesApi = {
  getTopRankings: (params = {}) => 
    api.get('/api/applications/rankings/top', { query: { limit: 100, ...params } }),
  
  getAllDetailed: (department = 'All', options = {}) => {
    const { fresh = false } = options;
    const query = department !== 'All' ? { department } : {};
    if (fresh) query._t = Date.now();
    return api.get('/api/applications/all/detailed', {
      query,
      skipCache: fresh,
    }).then(normalizeCandidatesList);
  },
  
  getById: (id, options = {}) => {
    const { fresh = false, query, ...rest } = options;
    const mergedQuery = fresh
      ? { _t: Date.now(), ...(query || {}) }
      : query;
    return api.get(`/api/applications/${id}`, {
      ...rest,
      query: mergedQuery,
      skipCache: fresh || rest.skipCache,
    });
  },
  
  submitApplication: (formData) => 
    api.post('/api/applications', formData, { retries: 1 }),
};

export default api;
