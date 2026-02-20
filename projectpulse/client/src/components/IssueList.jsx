function IssueList({ issues }) {
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
        <h3 className="text-lg font-semibold text-gray-900">Open Issues</h3>
        <span className="text-sm text-gray-500">{issues.length} open</span>
      </div>
      
      {issues.length === 0 ? (
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
          <p>No open issues</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.slice(0, 5).map((issue) => (
            <div key={issue.number} className="p-3 rounded-lg bg-gray-50">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 block truncate">
                    {issue.title}
                  </span>
                  <div className="mt-1 text-sm text-gray-500">
                    #{issue.number} opened {formatDate(issue.createdAt)} by {issue.author}
                  </div>
                  {issue.labels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {issue.labels.slice(0, 3).map((label) => (
                        <span
                          key={label.name}
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{
                            backgroundColor: `#${label.color}20`,
                            color: `#${label.color}`,
                            border: `1px solid #${label.color}40`
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {issue.labels.length > 3 && (
                        <span className="px-2 py-0.5 text-xs text-gray-500">
                          +{issue.labels.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {issues.length > 5 && (
        <p className="mt-3 text-sm text-gray-500 text-center">
          +{issues.length - 5} more issues
        </p>
      )}
    </div>
  );
}

export default IssueList;
