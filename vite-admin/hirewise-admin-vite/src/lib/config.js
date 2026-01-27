// Centralized API base URL for frontend -> backend requests
// Production uses the shared backend by default; env can override.
export const API_BASE = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.PROD ? 'https://hirewise-maxx-2.onrender.com' : 'http://localhost:5001');
