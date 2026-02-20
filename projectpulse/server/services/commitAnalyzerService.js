/**
 * Commit Analyzer Service
 * Fetches a single commit's diff from GitHub and uses AI to analyze what changed
 */

const GITHUB_API_BASE = 'https://api.github.com';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'kimi-k2.5:cloud';
const OLLAMA_TIMEOUT = 120000;

// File patterns to ignore during analysis
const IGNORED_PATTERNS = [
  // Lock files
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /Gemfile\.lock$/,
  /composer\.lock$/,
  /Cargo\.lock$/,
  /poetry\.lock$/,
  /Pipfile\.lock$/,

  // Images and binary
  /\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|tiff)$/i,
  /\.(woff|woff2|ttf|eot|otf)$/i,
  /\.(pdf|zip|tar|gz|rar|7z)$/i,

  // Build output and dist
  /^dist\//,
  /^build\//,
  /^out\//,
  /^\.next\//,
  /\.min\.(js|css)$/,
  /\.bundle\.(js|css)$/,

  // Generated / vendored
  /^vendor\//,
  /^node_modules\//,
  /\.generated\./,
  /\.d\.ts$/,

  // Source maps
  /\.map$/
];

/**
 * Fetch a single commit with full diff data from GitHub API
 */
async function fetchCommitDetail(owner, repo, sha, token) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${sha}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ProjectPulse'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (response.status === 404) {
    throw new Error('Commit not found. Make sure the SHA is correct and the repository is public.');
  }

  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    if (rateLimitRemaining === '0') {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const resetDate = new Date(resetTime * 1000);
      throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}.`);
    }
    throw new Error('Access forbidden. The repository may be private.');
  }

  if (response.status === 422) {
    throw new Error('Invalid commit SHA. Please provide a valid commit hash.');
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Filter out irrelevant files from the commit's file list
 */
function filterRelevantFiles(files) {
  return files.filter(file => {
    if (IGNORED_PATTERNS.some(pattern => pattern.test(file.filename))) {
      return false;
    }
    if (!file.patch) {
      return false;
    }
    if (file.patch.length > 50000) {
      return false;
    }
    return true;
  });
}

/**
 * Estimate token count for a string (rough: 1 token ~ 4 chars)
 */
function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

/**
 * Build diff chunks from filtered files, respecting a per-chunk token budget
 */
function chunkDiffs(files, maxTokensPerChunk = 6000) {
  if (files.length === 0) return [[]];

  const chunks = [];
  let currentChunk = [];
  let currentTokens = 0;

  for (const file of files) {
    const fileTokens = estimateTokens(file.patch) + estimateTokens(file.filename) + 20;

    // Single file exceeds budget — truncate and isolate
    if (fileTokens > maxTokensPerChunk) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentTokens = 0;
      }
      const maxPatchChars = (maxTokensPerChunk - 100) * 4;
      chunks.push([{
        ...file,
        patch: file.patch.substring(0, maxPatchChars) + '\n... [TRUNCATED - file too large]'
      }]);
      continue;
    }

    // Adding this file would exceed budget — start new chunk
    if (currentTokens + fileTokens > maxTokensPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(file);
    currentTokens += fileTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [[]];
}

/**
 * Build the AI prompt for analyzing a chunk of diffs
 */
function buildAnalysisPrompt(commitMeta, fileChunk, chunkIndex, totalChunks) {
  const systemPrompt = `You are a senior engineer writing concise commit analysis. Read the diff to determine what changed — do NOT trust the commit message. Be brief and specific. Respond with valid JSON only.`;

  const chunkNote = totalChunks > 1
    ? `\n(Chunk ${chunkIndex + 1} of ${totalChunks} — analyze only these files.)`
    : '';

  const filesSection = fileChunk.map(file =>
    `--- ${file.filename} (${file.status}, +${file.additions || 0} -${file.deletions || 0}) ---\n${file.patch}`
  ).join('\n\n');

  const userPrompt = `Analyze this commit diff. Return JSON with these exact fields:

{
  "headline": "One sentence, max 20 words. What this commit does.",
  "type": "feature" | "bugfix" | "refactor" | "config" | "test" | "docs" | "minor" | "unknown",
  "changeImpact": "low" | "medium" | "high",
  "fileChanges": [
    {
      "file": "short filename (just the basename or last 2 path segments)",
      "action": "What changed in this file — one concise sentence, max 15 words"
    }
  ],
  "keyInsight": "The single most important technical takeaway from this commit, 1-2 sentences max."
}

RULES:
- headline: Be specific. Not "Updated files" but "Adds JWT auth middleware to API routes".
- fileChanges: One entry per file. Skip trivial changes (whitespace, imports-only). Max 8 entries.
- keyInsight: The one thing a reviewer must know. Focus on logic, not formatting.
- Ignore formatting-only and whitespace-only changes entirely.

Commit ${commitMeta.sha.substring(0, 7)} by ${commitMeta.author}${chunkNote}

${filesSection}

Return only valid JSON.`;

  return { system: systemPrompt, user: userPrompt };
}

/**
 * Send a prompt to Ollama and parse the JSON response
 */
async function callOllamaForAnalysis(systemPrompt, userPrompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT);

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    throw new Error(`AI service error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data.message?.content;

  if (!rawContent) {
    throw new Error('AI returned empty content');
  }

  // Strip <think> tags and markdown code fences
  let cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();

  const result = JSON.parse(cleaned);

  // Validate required fields
  const validTypes = ['feature', 'bugfix', 'refactor', 'config', 'test', 'docs', 'minor', 'unknown'];
  const validImpacts = ['low', 'medium', 'high'];

  if (!result.headline) result.headline = 'Analysis could not determine a clear summary.';
  if (!validTypes.includes(result.type)) result.type = 'unknown';
  if (!validImpacts.includes(result.changeImpact)) result.changeImpact = 'medium';
  if (!Array.isArray(result.fileChanges)) result.fileChanges = [];
  if (!result.keyInsight) result.keyInsight = '';

  return result;
}

/**
 * Merge multiple chunk analysis results into one unified result
 */
function mergeChunkResults(chunkResults) {
  if (chunkResults.length === 1) return chunkResults[0];

  const headlines = chunkResults.map(r => r.headline).filter(Boolean);
  const types = chunkResults.map(r => r.type).filter(Boolean);
  const impacts = chunkResults.map(r => r.changeImpact).filter(Boolean);
  const fileChanges = chunkResults.flatMap(r => r.fileChanges || []);
  const insights = chunkResults.map(r => r.keyInsight).filter(Boolean);

  // Most common type wins
  const typeCounts = {};
  types.forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
  const dominantType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

  // Highest impact wins
  const impactOrder = { high: 3, medium: 2, low: 1 };
  const highestImpact = impacts
    .sort((a, b) => (impactOrder[b] || 0) - (impactOrder[a] || 0))[0] || 'medium';

  return {
    headline: headlines[0] || 'Multi-part commit with several changes',
    type: dominantType,
    changeImpact: highestImpact,
    fileChanges: fileChanges.slice(0, 10),
    keyInsight: insights.join(' ')
  };
}

/**
 * Main entry point: analyze a commit
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} sha - Commit SHA
 * @param {string} token - GitHub API token (optional)
 * @returns {Promise<object>} Structured analysis result
 */
export async function analyzeCommit(owner, repo, sha, token) {
  console.log(`Analyzing commit ${sha.substring(0, 7)} in ${owner}/${repo}...`);

  // 1. Fetch commit detail from GitHub
  const commitData = await fetchCommitDetail(owner, repo, sha, token);

  const commitMeta = {
    sha: commitData.sha,
    message: commitData.commit?.message?.split('\n')[0] || 'No message',
    author: commitData.author?.login || commitData.commit?.author?.name || 'unknown',
    date: commitData.commit?.author?.date || commitData.commit?.committer?.date || ''
  };

  // 2. Check if commit has files
  if (!commitData.files || commitData.files.length === 0) {
    throw new Error('Commit has no file changes to analyze.');
  }

  if (commitData.files.length > 300) {
    throw new Error('Commit too large for detailed analysis (300+ files). Try analyzing individual files.');
  }

  // 3. Filter relevant files
  const allFiles = commitData.files;
  const relevantFiles = filterRelevantFiles(allFiles);
  const filesSkipped = allFiles.length - relevantFiles.length;

  if (relevantFiles.length === 0) {
    return {
      headline: 'Non-source changes only (lock files, build output, images)',
      type: 'minor',
      changeImpact: 'low',
      fileChanges: [],
      keyInsight: `${allFiles.length} files changed but all were filtered out as non-source files.`,
      filesAnalyzed: 0,
      filesSkipped: allFiles.length,
      commitMeta
    };
  }

  // 4. Chunk diffs for large commits
  const chunks = chunkDiffs(relevantFiles);
  console.log(`Processing ${relevantFiles.length} files in ${chunks.length} chunk(s)...`);

  // 5. Analyze each chunk
  const chunkResults = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.length === 0) continue;

    const { system, user } = buildAnalysisPrompt(commitMeta, chunk, i, chunks.length);

    try {
      console.log(`Analyzing chunk ${i + 1}/${chunks.length} (${chunk.length} files)...`);
      const result = await callOllamaForAnalysis(system, user);
      chunkResults.push(result);
    } catch (error) {
      console.error(`Failed to analyze chunk ${i + 1}:`, error.message);
      // Continue with other chunks if one fails
      if (error.name === 'AbortError') {
        throw new Error('AI service timeout — the model took too long to respond.');
      }
      if (error.message.includes('ECONNREFUSED')) {
        throw new Error('AI service unavailable — make sure Ollama is running.');
      }
    }
  }

  if (chunkResults.length === 0) {
    throw new Error('AI analysis failed for all chunks. Try again or check that Ollama is running.');
  }

  // 6. Merge results
  const merged = mergeChunkResults(chunkResults);

  return {
    ...merged,
    filesAnalyzed: relevantFiles.length,
    filesSkipped,
    commitMeta
  };
}

export default { analyzeCommit };
