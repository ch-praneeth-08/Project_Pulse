const API_BASE = '/api';

/**
 * Fetch repository pulse data
 * @param {string} repoUrl - GitHub repository URL or owner/repo format
 * @returns {Promise<object>} Repository data
 */
export async function fetchPulseData(repoUrl) {
  const response = await fetch(`${API_BASE}/pulse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repoUrl }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || 'Failed to fetch repository data');
    error.response = { data };
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Send a chat message about the repository
 * @param {string} repoUrl - GitHub repository URL
 * @param {Array} messages - Chat messages array
 * @param {object} repoContext - Repository context data
 * @returns {Promise<object>} AI response
 */
export async function sendChatMessage(repoUrl, messages, repoContext) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repoUrl, messages, repoContext }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || 'Failed to send chat message');
    error.response = { data };
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Check API health
 * @returns {Promise<object>} Health status
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}
