import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
