function PullRequestList({ pullRequests }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Open Pull Requests</h3>
        <span className="text-sm text-gray-500">{pullRequests.length} open</span>
      </div>
      
      {pullRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>No open pull requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pullRequests.slice(0, 5).map((pr) => (
            <div
              key={pr.number}
              className={`p-3 rounded-lg bg-gray-50 ${pr.isDraft ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4 text-green-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                    <span className="font-medium text-gray-900 truncate">
                      {pr.title}
                    </span>
                    {pr.isDraft && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    #{pr.number} opened {formatDate(pr.createdAt)} by {pr.author}
                  </div>
                  {pr.branch && (
                    <div className="mt-1 text-xs text-gray-400">
                      {pr.branch} → {pr.baseBranch}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {pullRequests.length > 5 && (
        <p className="mt-3 text-sm text-gray-500 text-center">
          +{pullRequests.length - 5} more pull requests
        </p>
      )}
    </div>
  );
}

export default PullRequestList;
