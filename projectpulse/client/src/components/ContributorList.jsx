function ContributorList({ contributors }) {
  // Sort by recent activity (those with commitsByDay entries) then by total commits
  const sortedContributors = [...contributors].sort((a, b) => {
    const aActive = Object.keys(a.commitsByDay || {}).length;
    const bActive = Object.keys(b.commitsByDay || {}).length;
    if (aActive !== bActive) return bActive - aActive;
    return b.totalCommits - a.totalCommits;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Contributors</h3>
        <span className="text-sm text-gray-500">{contributors.length} total</span>
      </div>
      
      {contributors.length === 0 ? (
        <p className="text-gray-500 text-sm">No contributors found</p>
      ) : (
        <div className="space-y-3">
          {sortedContributors.slice(0, 8).map((contributor) => {
            const recentCommits = Object.values(contributor.commitsByDay || {}).reduce(
              (sum, count) => sum + count,
              0
            );
            const isActive = recentCommits > 0;

            return (
              <div
                key={contributor.login}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {contributor.avatarUrl ? (
                      <img
                        src={contributor.avatarUrl}
                        alt={contributor.login}
                        className="w-8 h-8 rounded-full"
                      />
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
                    <span className="font-medium text-gray-900">{contributor.login}</span>
                    {isActive && (
                      <span className="ml-2 text-xs text-green-600">
                        {recentCommits} this week
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {contributor.totalCommits.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500"> commits</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {contributors.length > 8 && (
        <p className="mt-3 text-sm text-gray-500 text-center">
          +{contributors.length - 8} more contributors
        </p>
      )}
    </div>
  );
}

export default ContributorList;
