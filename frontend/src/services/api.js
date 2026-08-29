// Normalize API Base URL (handles missing /api and trailing slashes)
function resolveApiBaseUrl() {
  let raw = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').trim();
  raw = raw.replace(/\/+$/, '');
  if (!raw.endsWith('/api')) {
    raw = `${raw}/api`;
  }
  return raw;
}

const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Format any API error into a clean, human-readable message.
 */
export function formatErrorMessage(err) {
  if (!err) return 'An unexpected error occurred. Please try again.';

  if (!err.response) {
    if (err.message === 'Network Error') {
      return 'Cannot reach backend server. Please check your internet connection or server status.';
    }
    return err.message || 'Unable to connect to the backend server.';
  }

  const { status, data } = err.response;

  // Catch HTML responses (e.g. Django debug 404 / 500 pages)
  if (typeof data === 'string') {
    if (data.includes('<!DOCTYPE html>') || data.includes('<html') || data.includes('<style>') || data.includes('Page not found')) {
      if (status === 404) return 'The requested API endpoint was not found on the server (404).';
      if (status === 500) return 'Internal server error (500). Please try again later.';
      if (status === 502 || status === 503) return 'Server is currently spinning up (Render cold start). Please wait 30 seconds and retry.';
      return `Server returned an error (HTTP ${status}).`;
    }
    return data;
  }

  // Catch DRF JSON validation / auth errors
  if (typeof data === 'object' && data !== null) {
    if (data.detail) return String(data.detail);
    if (data.error) return String(data.error);
    if (data.message) return String(data.message);

    // Non-field validation errors (e.g. invalid credentials)
    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
      return data.non_field_errors.join(' ');
    }

    // Field-specific validation errors (e.g. { username: ['A user with that username already exists.'] })
    const errors = [];
    for (const [field, msgs] of Object.entries(data)) {
      const fieldTitle = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
      if (Array.isArray(msgs)) {
        errors.push(`${fieldTitle}: ${msgs.join(' ')}`);
      } else if (typeof msgs === 'string') {
        errors.push(`${fieldTitle}: ${msgs}`);
      }
    }
    if (errors.length > 0) {
      return errors.join(' | ');
    }
  }

  if (status === 401) return 'Invalid credentials. Please verify username and password.';
  if (status === 403) return 'Access denied. You do not have permission.';
  if (status === 404) return 'Resource not found (404).';
  if (status >= 500) return 'Server error. Please try again in a few moments.';

  return `Request failed with status code ${status}.`;
}


// Automatically inject JWT token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('autotrace_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Register a new user account.
 */
export async function registerUser({ username, email, password }) {
  const { data } = await api.post('/auth/register/', { username, email, password });
  if (data?.tokens?.access) {
    localStorage.setItem('autotrace_token', data.tokens.access);
    localStorage.setItem('autotrace_user', JSON.stringify(data.user));
  }
  return data;
}

/**
 * Login user and obtain JWT tokens.
 */
export async function loginUser({ username, password }) {
  const { data } = await api.post('/auth/login/', { username, password });
  if (data?.access) {
    localStorage.setItem('autotrace_token', data.access);
  }
  return data;
}

/**
 * Fetch authenticated user profile & API key.
 */
export async function fetchUserProfile() {
  const { data } = await api.get('/auth/me/');
  localStorage.setItem('autotrace_user', JSON.stringify(data));
  return data;
}

/**
 * Regenerate / rotate API key.
 */
export async function regenerateApiKey() {
  const { data } = await api.post('/auth/regenerate-key/');
  return data;
}

/**
 * Logout user.
 */
export function logoutUser() {
  localStorage.removeItem('autotrace_token');
  localStorage.removeItem('autotrace_user');
}

/**
 * Fetch list of captured errors / incidents along with status counts.
 */
export async function fetchIncidents(params = {}) {
  const { data } = await api.get('/errors/', { params });
  return data;
}

/**
 * Fetch full detail for a single error / incident.
 */
export async function fetchIncidentDetail(id) {
  const { data } = await api.get(`/errors/${id}/`);
  return data;
}

/**
 * Update error status (e.g. mark RESOLVED or INVESTIGATING).
 */
export async function updateIncidentStatus(id, newStatus) {
  const { data } = await api.patch(`/errors/${id}/`, { status: newStatus });
  return data;
}

/**
 * Trigger simulated error scenario.
 */
export async function triggerChaosScenario(scenario = 'zero_division') {
  const { data } = await api.post(`/chaos/trigger/?scenario=${scenario}`);
  return data;
}

export default api;
