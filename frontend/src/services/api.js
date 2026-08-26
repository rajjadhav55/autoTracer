import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch the list of incidents along with status counts.
 * @returns {{ counts: object, results: Array }}
 */
export async function fetchIncidents() {
  const { data } = await api.get('/incidents/');
  return data;
}

/**
 * Fetch full detail for a single incident.
 * @param {string} id - UUID of the incident
 */
export async function fetchIncidentDetail(id) {
  const { data } = await api.get(`/incidents/${id}/`);
  return data;
}

/**
 * Trigger a simulated error scenario for testing AutoTrace triage.
 * @param {string} scenario - e.g. 'null_pointer', 'zero_division', 'database_timeout'
 */
export async function triggerChaosScenario(scenario = 'zero_division') {
  const { data } = await api.post(`/chaos/trigger/?scenario=${scenario}`);
  return data;
}

export default api;
