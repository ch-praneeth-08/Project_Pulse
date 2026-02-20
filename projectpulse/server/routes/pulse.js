/**
 * Pulse Routes
 * API endpoints for fetching repository health data
 */

import express from 'express';
import { fetchRepoData, parseRepoUrl } from '../services/githubService.js';
import { getCachedData, setCachedData } from '../services/cacheService.js';
import { generatePulseSummary } from '../services/ollamaService.js';

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
 * Chat with AI about the repository (placeholder for now)
 * Body: { repoUrl: string, messages: [{role, content}], repoContext: object }
 */
router.post('/chat', async (req, res) => {
  // Placeholder for AI chat - will be implemented later
  res.status(501).json({
    error: 'Chat feature not yet implemented',
    code: 'NOT_IMPLEMENTED'
  });
});

export default router;
