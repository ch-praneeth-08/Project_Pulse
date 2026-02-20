/**
 * Pulse Routes
 * API endpoints for fetching repository health data
 */

import express from 'express';
import { fetchRepoData, parseRepoUrl } from '../services/githubService.js';
import { getCachedData, setCachedData } from '../services/cacheService.js';
import { generatePulseSummary } from '../services/ollamaService.js';
import { streamChatResponse } from '../services/chatService.js';
import { analyzeCommit } from '../services/commitAnalyzerService.js';

const router = express.Router();

/**
 * POST /api/pulse
 * Fetch repository health data with AI-generated summary
 * Body: { repoUrl: "https://github.com/owner/repo" }
 */
router.post('/pulse', async (req, res, next) => {
  try {
    const { repoUrl } = req.body;

    // Validate input
    if (!repoUrl || typeof repoUrl !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid repoUrl parameter',
        code: 'INVALID_INPUT'
      });
    }

    // Validate URL format
    try {
      parseRepoUrl(repoUrl);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_URL'
      });
    }

    // Check cache first (includes both repoData and summary)
    const cachedData = getCachedData(repoUrl);
    if (cachedData) {
      return res.json({
        ...cachedData,
        cached: true
      });
    }

    // Fetch fresh data from GitHub
    const token = process.env.GITHUB_TOKEN;
    const repoData = await fetchRepoData(repoUrl, token);

    // Generate AI summary
    let summary = null;
    let summaryError = null;

    try {
      console.log('Generating AI summary with Ollama...');
      const startTime = Date.now();
      summary = await generatePulseSummary(repoData);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (summary) {
        console.log(`AI summary generated successfully in ${duration}s`);
      } else {
        console.log('AI returned malformed response, summary will be null');
        summaryError = 'AI returned malformed response';
      }
    } catch (aiError) {
      console.error('AI summary generation failed:', aiError.message);
      summaryError = aiError.message;
    }

    // Prepare response
    const responseData = {
      repoData,
      summary,
      summaryError
    };

    // Cache the full response (repoData + summary) with 5-minute TTL
    setCachedData(repoUrl, responseData);

    // Return the data
    res.json({
      ...responseData,
      cached: false
    });

  } catch (error) {
    console.error('Error in /api/pulse:', error);

    // Handle specific error types
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'REPO_NOT_FOUND'
      });
    }

    if (error.message.includes('rate limit')) {
      return res.status(429).json({
        error: error.message,
        code: 'RATE_LIMITED'
      });
    }

    if (error.message.includes('private') || error.message.includes('forbidden')) {
      return res.status(403).json({
        error: error.message,
        code: 'ACCESS_DENIED'
      });
    }

    // Generic error
    next(error);
  }
});

/**
 * POST /api/chat
 * Chat with AI about the repository using SSE streaming
 * Body: { messages: [{role, content}], repoContext: object }
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, repoContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid messages array',
        code: 'INVALID_INPUT'
      });
    }

    if (!repoContext || !repoContext.meta) {
      return res.status(400).json({
        error: 'Missing repoContext — run a pulse first',
        code: 'MISSING_CONTEXT'
      });
    }

    // Limit conversation to last 20 messages
    const trimmedMessages = messages.slice(-20);

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    let fullResponse = '';

    try {
      fullResponse = await streamChatResponse(
        trimmedMessages,
        repoContext,
        (chunk) => {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      );

      res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`);
    } catch (streamError) {
      console.error('Chat stream error:', streamError.message);
      res.write(`data: ${JSON.stringify({ error: streamError.message })}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error('Error in /api/chat:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || 'Chat service error',
        code: 'CHAT_ERROR'
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/commit/analyze
 * Analyze a specific commit using AI
 * Body: { owner: string, repo: string, sha: string }
 */
router.post('/commit/analyze', async (req, res, next) => {
  try {
    const { owner, repo, sha } = req.body;

    if (!owner || typeof owner !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid owner parameter', code: 'INVALID_INPUT' });
    }
    if (!repo || typeof repo !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid repo parameter', code: 'INVALID_INPUT' });
    }
    if (!sha || typeof sha !== 'string' || sha.trim().length < 7) {
      return res.status(400).json({ error: 'Missing or invalid sha parameter (min 7 characters)', code: 'INVALID_INPUT' });
    }

    // Cache check — commit SHAs are immutable so caching is safe
    const cacheKey = `commit:${owner.toLowerCase()}/${repo.toLowerCase()}/${sha.toLowerCase()}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const token = process.env.GITHUB_TOKEN;
    const result = await analyzeCommit(owner, repo, sha.trim(), token);

    setCachedData(cacheKey, result);

    res.json({ ...result, cached: false });

  } catch (error) {
    console.error('Error in /api/commit/analyze:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message, code: 'COMMIT_NOT_FOUND' });
    }
    if (error.message.includes('rate limit')) {
      return res.status(429).json({ error: error.message, code: 'RATE_LIMITED' });
    }
    if (error.message.includes('private') || error.message.includes('forbidden')) {
      return res.status(403).json({ error: error.message, code: 'ACCESS_DENIED' });
    }
    next(error);
  }
});

/**
 * GET /api/repos/:owner/:repo/contributors/:username/commits
 * Fetch latest 5 commits by a specific contributor
 */
router.get('/repos/:owner/:repo/contributors/:username/commits', async (req, res, next) => {
  try {
    const { owner, repo, username } = req.params;

    const cacheKey = `contributor-commits:${owner.toLowerCase()}/${repo.toLowerCase()}/${username.toLowerCase()}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const token = process.env.GITHUB_TOKEN;
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?author=${username}&per_page=5`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ProjectPulse'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Repository not found', code: 'REPO_NOT_FOUND' });
      }
      if (response.status === 403) {
        return res.status(429).json({ error: 'Rate limited', code: 'RATE_LIMITED' });
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const commits = data.map(c => ({
      sha: c.sha,
      message: c.commit.message.split('\n')[0],
      date: c.commit.author?.date || c.commit.committer?.date,
      author: c.author?.login || c.commit.author?.name || username
    }));

    setCachedData(cacheKey, commits);
    res.json(commits);

  } catch (error) {
    console.error('Error fetching contributor commits:', error.message);
    next(error);
  }
});

export default router;
