/**
 * Unified API Client for Terra / LandAI Intelligent Property Platform.
 * Supports configurable API Base URL for local development and production deployments.
 */

export const API_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  ''
).replace(/\/+$/, '');

/**
 * Returns full URL for a given API endpoint.
 * If endpoint starts with http, it is returned as-is.
 */
export function apiUrl(endpoint) {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!API_BASE_URL) return cleanEndpoint;
  return `${API_BASE_URL}${cleanEndpoint}`;
}

/**
 * Robust JSON request wrapper with structured error handling.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = apiUrl(endpoint);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('landai_token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    throw new Error(
      'Cannot connect to the server. Please check your network connection and ensure the backend service is running.'
    );
  }

  let data = {};
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => '');
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`API endpoint not found: ${endpoint}. Verify that the backend server is reachable.`);
      }
      throw new Error(`Server returned HTTP ${response.status}. Please try again later.`);
    }
  }

  if (!response.ok) {
    const errorMsg =
      data.error ||
      data.message ||
      `Request failed with status code ${response.status}. Please try again.`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}
