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
 * Send a chat message and receive a streamed SSE response
 * @param {Array} messages - Chat messages array [{role, content}]
 * @param {object} repoContext - Full repoData object
 * @param {function} onChunk - Called with (chunk, accumulatedText) as tokens arrive
 * @returns {Promise<string>} The complete response text
 */
export async function sendChatMessage(messages, repoContext, onChunk) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, repoContext }),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      throw new Error(data.error || 'Chat request failed');
    }
    throw new Error(`Chat request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split('\n');

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6);

      try {
        const data = JSON.parse(jsonStr);

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.chunk) {
          fullResponse += data.chunk;
          if (onChunk) onChunk(data.chunk, fullResponse);
        }

        if (data.done) {
          return data.fullResponse || fullResponse;
        }
      } catch (e) {
        if (e.message && !e.message.includes('JSON')) throw e;
      }
    }
  }

  return fullResponse;
}

/**
 * Analyze a specific commit using AI
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} sha - Commit SHA
 * @returns {Promise<object>} Analysis result
 */
export async function analyzeCommit(owner, repo, sha) {
  const response = await fetch(`${API_BASE}/commit/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, repo, sha }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || 'Failed to analyze commit');
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
