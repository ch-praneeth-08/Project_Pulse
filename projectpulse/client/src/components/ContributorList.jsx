import { useState } from 'react';
import PropTypes from 'prop-types';
import { fetchContributorCommits } from '../utils/api';

/**
 * Relative time helper
 */
function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function ContributorList({ contributors, commits, owner, repo, onAnalyzeCommit }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [fetchedCommits, setFetchedCommits] = useState({});
  const [loadingUser, setLoadingUser] = useState(null);

  // Sort by recent activity then total commits
  const sortedContributors = [...contributors].sort((a, b) => {
    const aActive = Object.values(a.commitsByDay || {}).reduce((s, c) => s + c, 0);
    const bActive = Object.values(b.commitsByDay || {}).reduce((s, c) => s + c, 0);
    if (aActive !== bActive) return bActive - aActive;
    return b.totalCommits - a.totalCommits;
  });

  // Filter by search
  const filtered = searchQuery
    ? sortedContributors.filter(c => c.login.toLowerCase().includes(searchQuery.toLowerCase()))
    : sortedContributors;

  const displayList = filtered.slice(0, 10);

  // Merge local + fetched commits, dedupe by SHA, take 5
  function getCommitsForUser(username) {
    const local = (commits || []).filter(c => c.author === username);
    const fetched = fetchedCommits[username] || [];
    const merged = new Map();
    [...local, ...fetched].forEach(c => {
      if (!merged.has(c.sha)) merged.set(c.sha, c);
    });
    return Array.from(merged.values())
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }

  async function handleExpand(username) {
    if (expandedUser === username) {
      setExpandedUser(null);
      return;
    }
    setExpandedUser(username);

    const local = (commits || []).filter(c => c.author === username);
    if (local.length < 5 && !fetchedCommits[username] && owner && repo) {
      setLoadingUser(username);
      try {
        const data = await fetchContributorCommits(owner, repo, username);
        setFetchedCommits(prev => ({ ...prev, [username]: data }));
      } catch (err) {
        console.warn('Failed to fetch commits for', username, err.message);
      } finally {
        setLoadingUser(null);
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Contributors</h3>
        <span className="text-sm text-gray-500">{contributors.length} total</span>
      </div>

      {/* Search */}
      {contributors.length > 3 && (
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contributors..."
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                       focus:ring-2 focus:ring-pulse-500 focus:border-transparent outline-none"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {searchQuery ? 'No contributors match your search' : 'No contributors found'}
        </p>
      ) : (
        <div className="space-y-1">
          {displayList.map((contributor) => {
            const recentCommits = Object.values(contributor.commitsByDay || {}).reduce(
              (sum, count) => sum + count, 0
            );
            const isActive = recentCommits > 0;
            const isExpanded = expandedUser === contributor.login;
            const userCommits = isExpanded ? getCommitsForUser(contributor.login) : [];
            const isLoading = loadingUser === contributor.login;

            return (
              <div key={contributor.login}>
                {/* Clickable contributor row */}
                <button
                  onClick={() => handleExpand(contributor.login)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors
                    ${isExpanded ? 'bg-pulse-50 border border-pulse-200' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-shrink-0">
                      {contributor.avatarUrl ? (
                        <img src={contributor.avatarUrl} alt={contributor.login}
                             className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {contributor.login[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      {isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 text-sm">{contributor.login}</span>
                      {isActive && (
                        <span className="ml-2 text-xs text-green-600">{recentCommits} this week</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{contributor.totalCommits} commits</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Commit dropdown */}
                {isExpanded && (
                  <div className="ml-11 mt-1 mb-2">
                    {isLoading && userCommits.length === 0 ? (
                      <div className="py-3 text-xs text-gray-400 flex items-center space-x-2">
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Loading commits...</span>
                      </div>
                    ) : userCommits.length === 0 ? (
                      <p className="py-2 text-xs text-gray-400">No recent commits found</p>
                    ) : (
                      <div className="border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-50">
                        {userCommits.map((commit) => (
                          <div key={commit.sha}
                               className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 gap-2">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <code className="text-xs font-mono text-gray-400 flex-shrink-0">
                                {commit.sha.substring(0, 7)}
                              </code>
                              <span className="text-xs text-gray-700 truncate">
                                {commit.message.length > 40
                                  ? commit.message.substring(0, 40) + '...'
                                  : commit.message}
                              </span>
                              <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">
                                {timeAgo(commit.date)}
                              </span>
                            </div>
                            {onAnalyzeCommit && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAnalyzeCommit(commit.sha);
                                }}
                                className="px-2 py-0.5 text-xs font-medium text-pulse-700 bg-pulse-50
                                           hover:bg-pulse-100 rounded border border-pulse-200 flex-shrink-0
                                           transition-colors"
                              >
                                Summarize
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 10 && (
        <p className="mt-3 text-sm text-gray-500 text-center">
          +{filtered.length - 10} more contributors
        </p>
      )}
    </div>
  );
}

ContributorList.propTypes = {
  contributors: PropTypes.array.isRequired,
  commits: PropTypes.array,
  owner: PropTypes.string,
  repo: PropTypes.string,
  onAnalyzeCommit: PropTypes.func,
};

export default ContributorList;
