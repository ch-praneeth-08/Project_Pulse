/**
 * Chat Service
 * Handles conversational AI about repository data using Ollama cloud models
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'kimi-k2.5:cloud';
const CHAT_TIMEOUT = 180000; // 3 minutes for cloud model

/**
 * Build the system prompt with repo context
 */
function buildSystemPrompt(repoContext) {
  const { meta, commits, branches, pullRequests, issues, contributors, blockers } = repoContext;

  const recentCommitters = [...new Set(commits.slice(0, 20).map(c => c.author))];

  return `You are ProjectPulse AI, an expert assistant for the GitHub repository "${meta.fullName}".
You have access to live data about this repository. Answer questions specifically using this data.
Be direct, specific, and mention actual names/numbers. Do not hedge or use filler phrases.

=== REPOSITORY CONTEXT ===
Repository: ${meta.fullName} (${meta.language || 'Unknown language'})
Description: ${meta.description || 'No description'}
Stars: ${meta.stars} | Forks: ${meta.forks}
Default Branch: ${meta.defaultBranch}

--- Recent Activity (last 7 days) ---
Total commits: ${commits.length}
Active committers: ${recentCommitters.join(', ') || 'None'}

--- Branches (${branches.length} total) ---
${branches.slice(0, 15).map(b =>
    `- ${b.name}: last commit ${b.daysSinceLastCommit ?? '?'} days ago by ${b.lastCommitAuthor || 'unknown'}${b.isStale ? ' [STALE]' : ''}${b.hasOpenPR ? ' [HAS PR]' : ''}`
  ).join('\n')}

--- Open Pull Requests (${pullRequests.length} total) ---
${pullRequests.slice(0, 10).map(pr =>
    `- PR #${pr.number}: "${pr.title}" by ${pr.author} (opened ${pr.createdAt}${pr.isDraft ? ', DRAFT' : ''})`
  ).join('\n') || 'None'}

--- Open Issues (${issues.length} total) ---
${issues.slice(0, 10).map(issue =>
    `- Issue #${issue.number}: "${issue.title}" [${issue.labels.map(l => l.name).join(', ')}] by ${issue.author} (opened ${issue.createdAt})`
  ).join('\n') || 'None'}

--- Contributors ---
${contributors.slice(0, 10).map(c =>
    `- ${c.login}: ${c.totalCommits} total commits`
  ).join('\n')}

--- Detected Blockers ---
${(blockers || []).length === 0 ? 'No blockers detected.' :
    blockers.map(b => `- [${b.severity.toUpperCase()}] ${b.title}: ${b.description}`).join('\n')}

=== END CONTEXT ===

Rules:
- Always ground your answers in the data above.
- If asked about something not in the data, say so clearly.
- When recommending people for tasks, base it on their recent activity and PR/commit history.
- Keep responses concise (2-4 paragraphs max) unless the user asks for detail.`;
}

/**
 * Strip think tags from model responses
 */
function cleanResponse(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/**
 * Send a chat message and stream the response
 * @param {Array} messages - [{role: 'user'|'assistant', content: string}]
 * @param {object} repoContext - Full repoData object
 * @param {function} onChunk - Callback for each streamed chunk
 * @returns {Promise<string>} Complete response text
 */
export async function streamChatResponse(messages, repoContext, onChunk) {
  const systemPrompt = buildSystemPrompt(repoContext);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT);

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CHAT_MODEL,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat model error: ${response.status} - ${errorText}`);
  }

  let fullResponse = '';
  let inThinkBlock = false;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.message?.content) {
          fullResponse += parsed.message.content;

          // Track think blocks to avoid streaming them
          if (parsed.message.content.includes('<think>')) inThinkBlock = true;
          if (parsed.message.content.includes('</think>')) {
            inThinkBlock = false;
            continue;
          }
          if (!inThinkBlock) {
            onChunk(parsed.message.content);
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
  }

  return cleanResponse(fullResponse);
}

/**
 * Non-streaming version (fallback)
 */
export async function sendChatMessage(messages, repoContext) {
  const systemPrompt = buildSystemPrompt(repoContext);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT);

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CHAT_MODEL,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Chat model error: ${response.status}`);
  }

  const data = await response.json();
  return cleanResponse(data.message?.content || '');
}

export default { streamChatResponse, sendChatMessage };
