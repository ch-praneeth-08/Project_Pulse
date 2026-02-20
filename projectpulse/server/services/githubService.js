/**
 * GitHub Data Service
 * Fetches and normalizes repository data from GitHub REST API
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Parse a GitHub repo URL or owner/repo string into owner and repo
 * @param {string} repoUrl - The repo URL or owner/repo format
 * @returns {{ owner: string, repo: string }}
 */
export function parseRepoUrl(repoUrl) {
  // Handle both https://github.com/owner/repo and owner/repo formats
  const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
  const shortPattern = /^([^\/]+)\/([^\/]+)$/;

  let match = repoUrl.match(urlPattern);
  if (match) {
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  }

  match = repoUrl.trim().match(shortPattern);
  if (match) {
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  }

  throw new Error('Invalid repository URL. Use https://github.com/owner/repo or owner/repo format.');
}

/**
 * Make an authenticated request to the GitHub API
 */
async function githubFetch(endpoint, token) {
  const url = `${GITHUB_API_BASE}${endpoint}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ProjectPulse'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (response.status === 404) {
    throw new Error('Repository not found. Make sure the repository exists and is public.');
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

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch all pages of a paginated GitHub API endpoint
 */
async function fetchAllPages(endpoint, token, maxPages = 10) {
  const results = [];
  let page = 1;

  while (page <= maxPages) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const data = await githubFetch(`${endpoint}${separator}per_page=100&page=${page}`, token);
    
    if (!Array.isArray(data) || data.length === 0) break;
    
    results.push(...data);
    
    if (data.length < 100) break;
    page++;
  }

  return results;
}

/**
 * Fetch commits from the last 7 days for a branch
 */
async function fetchRecentCommits(owner, repo, branch, token) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since = sevenDaysAgo.toISOString();

  try {
    const commits = await fetchAllPages(
      `/repos/${owner}/${repo}/commits?sha=${branch}&since=${since}`,
      token,
      5
    );

    return commits.map(commit => ({
      sha: commit.sha,
      author: commit.author?.login || commit.commit.author?.name || 'unknown',
      authorAvatar: commit.author?.avatar_url || null,
      date: commit.commit.author?.date || commit.commit.committer?.date,
      message: commit.commit.message.split('\n')[0], // First line only
      branch
    }));
  } catch (error) {
    // Branch might not exist or have no commits in the time range
    console.warn(`Could not fetch commits for branch ${branch}:`, error.message);
    return [];
  }
}

/**
 * Fetch all branches with their last commit info
 */
async function fetchBranches(owner, repo, token) {
  const branches = await fetchAllPages(`/repos/${owner}/${repo}/branches`, token, 5);

  return Promise.all(branches.map(async (branch) => {
    // Get detailed commit info for the branch's last commit
    let lastCommitDate = null;
    let lastCommitAuthor = null;

    try {
      const commitData = await githubFetch(
        `/repos/${owner}/${repo}/commits/${branch.commit.sha}`,
        token
      );
      lastCommitDate = commitData.commit.author?.date || commitData.commit.committer?.date;
      lastCommitAuthor = commitData.author?.login || commitData.commit.author?.name || 'unknown';
    } catch (error) {
      console.warn(`Could not fetch commit details for branch ${branch.name}`);
    }

    const daysSinceLastCommit = lastCommitDate
      ? Math.floor((Date.now() - new Date(lastCommitDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      name: branch.name,
      lastCommitDate,
      lastCommitAuthor,
      daysSinceLastCommit,
      isStale: false // Will be calculated after we have PRs/issues
    };
  }));
}

/**
 * Fetch open pull requests
 */
async function fetchPullRequests(owner, repo, token) {
  const prs = await fetchAllPages(`/repos/${owner}/${repo}/pulls?state=open`, token, 3);

  return prs.map(pr => ({
    number: pr.number,
    title: pr.title,
    author: pr.user?.login || 'unknown',
    authorAvatar: pr.user?.avatar_url || null,
    state: pr.state,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    mergedAt: pr.merged_at,
    branch: pr.head?.ref || null,
    baseBranch: pr.base?.ref || null,
    isDraft: pr.draft || false
  }));
}

/**
 * Fetch open issues (excluding pull requests)
 */
async function fetchIssues(owner, repo, token) {
  const issues = await fetchAllPages(`/repos/${owner}/${repo}/issues?state=open`, token, 3);

  // Filter out pull requests (they show up in issues API too)
  return issues
    .filter(issue => !issue.pull_request)
    .map(issue => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels: issue.labels.map(label => ({
        name: label.name,
        color: label.color
      })),
      assignees: issue.assignees.map(assignee => ({
        login: assignee.login,
        avatarUrl: assignee.avatar_url
      })),
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      author: issue.user?.login || 'unknown'
    }));
}

/**
 * Fetch repository metadata
 */
async function fetchRepoMetadata(owner, repo, token) {
  const data = await githubFetch(`/repos/${owner}/${repo}`, token);

  return {
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    owner: data.owner?.login,
    ownerAvatar: data.owner?.avatar_url,
    defaultBranch: data.default_branch,
    language: data.language,
    stars: data.stargazers_count,
    forks: data.forks_count,
    openIssues: data.open_issues_count,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    pushedAt: data.pushed_at,
    htmlUrl: data.html_url
  };
}

/**
 * Fetch contributors with their commit counts
 */
async function fetchContributors(owner, repo, token) {
  try {
    const contributors = await fetchAllPages(`/repos/${owner}/${repo}/contributors`, token, 3);

    return contributors.map(contributor => ({
      login: contributor.login,
      avatarUrl: contributor.avatar_url,
      totalCommits: contributor.contributions,
      commitsByDay: {} // Will be populated from commits data
    }));
  } catch (error) {
    console.warn('Could not fetch contributors:', error.message);
    return [];
  }
}

/**
 * Calculate contributor activity from commits
 */
function enrichContributorsWithActivity(contributors, commits) {
  const activityByAuthor = {};

  commits.forEach(commit => {
    const author = commit.author;
    if (!activityByAuthor[author]) {
      activityByAuthor[author] = {};
    }

    const date = new Date(commit.date).toISOString().split('T')[0];
    activityByAuthor[author][date] = (activityByAuthor[author][date] || 0) + 1;
  });

  return contributors.map(contributor => ({
    ...contributor,
    commitsByDay: activityByAuthor[contributor.login] || {}
  }));
}

/**
 * Mark branches as stale based on inactivity and linked PRs/issues
 */
function markStaleBranches(branches, pullRequests, issues) {
  const prBranches = new Set(pullRequests.map(pr => pr.branch).filter(Boolean));
  
  // A branch is stale if:
  // 1. No commits in last 48 hours (2 days)
  // 2. AND has open PRs or is linked to issues
  return branches.map(branch => {
    const hasOpenPR = prBranches.has(branch.name);
    const isInactive = branch.daysSinceLastCommit !== null && branch.daysSinceLastCommit >= 2;
    
    return {
      ...branch,
      isStale: isInactive && hasOpenPR,
      hasOpenPR
    };
  });
}

/**
 * Main function to fetch all repository data in parallel
 * @param {string} repoUrl - The GitHub repository URL or owner/repo
 * @param {string} token - GitHub API token (optional but recommended)
 * @returns {Promise<object>} Normalized repository data
 */
export async function fetchRepoData(repoUrl, token) {
  const { owner, repo } = parseRepoUrl(repoUrl);

  // Fetch metadata first to get default branch
  const meta = await fetchRepoMetadata(owner, repo, token);

  // Fetch all other data in parallel
  const [branches, pullRequests, issues, contributors] = await Promise.all([
    fetchBranches(owner, repo, token),
    fetchPullRequests(owner, repo, token),
    fetchIssues(owner, repo, token),
    fetchContributors(owner, repo, token)
  ]);

  // Fetch commits from default branch and active PR branches
  const branchesToFetch = new Set([meta.defaultBranch]);
  pullRequests.forEach(pr => {
    if (pr.branch) branchesToFetch.add(pr.branch);
  });

  // Limit to 5 branches to avoid too many API calls
  const branchArray = Array.from(branchesToFetch).slice(0, 5);
  
  const commitArrays = await Promise.all(
    branchArray.map(branch => fetchRecentCommits(owner, repo, branch, token))
  );

  // Flatten and dedupe commits by SHA
  const commitMap = new Map();
  commitArrays.flat().forEach(commit => {
    if (!commitMap.has(commit.sha)) {
      commitMap.set(commit.sha, commit);
    }
  });
  const commits = Array.from(commitMap.values()).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Enrich data
  const enrichedContributors = enrichContributorsWithActivity(contributors, commits);
  const enrichedBranches = markStaleBranches(branches, pullRequests, issues);

  return {
    meta,
    commits,
    branches: enrichedBranches,
    pullRequests,
    issues,
    contributors: enrichedContributors,
    fetchedAt: new Date().toISOString()
  };
}

export default { fetchRepoData, parseRepoUrl };
