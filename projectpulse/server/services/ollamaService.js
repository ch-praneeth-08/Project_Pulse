/**
 * Ollama Service
 * Generates AI-powered health summaries using local Ollama instance
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'kimi-k2.5:cloud';
const OLLAMA_TIMEOUT = 120000; // 120 seconds for local LLM (large prompts need more time)

console.log(`Ollama Service initialized with model: ${OLLAMA_MODEL} at ${OLLAMA_BASE_URL}`);

/**
 * Extract JSON from raw model response
 * Handles qwen3-coder's <think> tags and markdown code fences
 */
function extractJSON(rawContent) {
  // Remove <think>...</think> blocks including content
  let cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  
  // Remove any markdown code fences if present
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
  
  return cleaned;
}

/**
 * Condense repoData into only what matters for the summary
 */
function condenseRepoData(repoData) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Filter commits from last 7 days
  const recentCommits = repoData.commits.filter(
    commit => new Date(commit.date) >= sevenDaysAgo
  );

  // Count commits per contributor in last 7 days
  const contributorCommits = {};
  recentCommits.forEach(commit => {
    const author = commit.author;
    contributorCommits[author] = (contributorCommits[author] || 0) + 1;
  });

  // Get active contributors (at least 1 commit in last 7 days)
  const activeContributors = Object.entries(contributorCommits)
    .map(([name, commits]) => ({ name, commits }))
    .sort((a, b) => b.commits - a.commits);

  // Condense branch info
  const branchSummary = repoData.branches.map(branch => ({
    name: branch.name,
    lastCommitDate: branch.lastCommitDate,
    daysSinceLastCommit: branch.daysSinceLastCommit,
    isStale: branch.isStale,
    hasOpenPR: branch.hasOpenPR
  }));

  return {
    repo: {
      name: repoData.meta.name,
      fullName: repoData.meta.fullName,
      description: repoData.meta.description,
      language: repoData.meta.language,
      stars: repoData.meta.stars,
      forks: repoData.meta.forks
    },
    activity: {
      totalCommitsLast7Days: recentCommits.length,
      activeContributorCount: activeContributors.length,
      contributorActivity: activeContributors.slice(0, 10), // Top 10 contributors
      openPRCount: repoData.pullRequests.length,
      openIssueCount: repoData.issues.length
    },
    branches: branchSummary.slice(0, 15), // Limit to 15 branches
    openPRs: repoData.pullRequests.slice(0, 10).map(pr => ({
      number: pr.number,
      title: pr.title,
      author: pr.author,
      createdAt: pr.createdAt,
      isDraft: pr.isDraft
    })),
    openIssues: repoData.issues.slice(0, 10).map(issue => ({
      number: issue.number,
      title: issue.title,
      labels: issue.labels.map(l => l.name),
      createdAt: issue.createdAt
    })),
    blockers: (repoData.blockers || []).map(b => ({
      type: b.type,
      severity: b.severity,
      title: b.title,
      suggestedAction: b.suggestedAction
    }))
  };
}

/**
 * Generate a health summary using Ollama
 * @param {object} repoData - The full normalized repo data from GitHub
 * @returns {Promise<object|null>} The summary object or null if generation fails
 */
export async function generatePulseSummary(repoData) {
  const condensedData = condenseRepoData(repoData);

  const systemPrompt = `You are an intelligent project health analyzer for software teams. You receive structured data about a GitHub repository and produce a concise, plain-English health summary. You write like a sharp technical lead giving a quick standup update — clear, honest, and specific. Never use filler phrases. Never say 'it appears' or 'it seems'. Be direct. Always respond with valid JSON only — no markdown, no code fences, no explanation outside the JSON.`;

  const userPrompt = `Analyze the following GitHub project data and return a JSON object with exactly these fields:

{
  "overallHealth": "Healthy" | "At Risk" | "Critical",
  "headline": "One punchy sentence summarizing the project state right now. Max 15 words.",
  "summary": "3-5 sentences covering: overall activity level, who is driving the work, any concerning patterns, and general momentum. Be specific — mention contributor names and numbers.",
  "highlights": ["array of 2-3 positive things happening in the repo"],
  "concerns": ["array of 1-3 specific concerns, or empty array if none"],
  "blockers": ["array of 0-3 specific blocker descriptions in plain English. Each should name the PR/issue number and explain why it's blocked. Empty array if no blockers detected in the data."],
  "recommendation": "One actionable sentence the team should act on today."
}

If the "blockers" array in the project data below is non-empty, you MUST mention them in the summary and populate the blockers field. These are the most important signals for team health.

Return only valid JSON. No markdown. No code fences. No explanation outside the JSON.

Project Data:
${JSON.stringify(condensedData, null, 2)}`;

  try {
    console.log(`Calling Ollama API with model: ${OLLAMA_MODEL}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama API error: ${response.status} - ${errorText}`);
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.message?.content;

    if (!rawContent) {
      console.error('Ollama returned empty content');
      return null;
    }

    // Extract and parse JSON from response
    const cleanedContent = extractJSON(rawContent);
    
    try {
      const summary = JSON.parse(cleanedContent);
      
      // Validate required fields
      const requiredFields = ['overallHealth', 'headline', 'summary', 'highlights', 'concerns', 'blockers', 'recommendation'];
      const missingFields = requiredFields.filter(field => !(field in summary));
      
      if (missingFields.length > 0) {
        console.error(`Summary missing required fields: ${missingFields.join(', ')}`);
        return null;
      }

      // Validate overallHealth value
      const validHealthValues = ['Healthy', 'At Risk', 'Critical'];
      if (!validHealthValues.includes(summary.overallHealth)) {
        console.warn(`Invalid overallHealth value: ${summary.overallHealth}, defaulting to "At Risk"`);
        summary.overallHealth = 'At Risk';
      }

      // Ensure arrays are arrays
      if (!Array.isArray(summary.highlights)) {
        summary.highlights = [];
      }
      if (!Array.isArray(summary.concerns)) {
        summary.concerns = [];
      }
      if (!Array.isArray(summary.blockers)) {
        summary.blockers = [];
      }

      return summary;
    } catch (parseError) {
      console.error('Failed to parse Ollama response as JSON:', parseError.message);
      console.error('Raw content:', rawContent);
      console.error('Cleaned content:', cleanedContent);
      return null;
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Ollama request timed out after 60 seconds');
      throw new Error('AI service timeout — the model took too long to respond.');
    }
    
    if (error.cause?.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      throw new Error('AI service unavailable — make sure Ollama is running on port 11434 with qwen3-coder:30b loaded.');
    }

    console.error('Ollama service error:', error);
    throw error;
  }
}

export default { generatePulseSummary };
