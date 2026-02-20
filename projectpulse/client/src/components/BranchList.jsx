function BranchList({ branches }) {
  const sortedBranches = [...branches].sort((a, b) => {
    // Stale branches first, then by last commit date
    if (a.isStale && !b.isStale) return -1;
    if (!a.isStale && b.isStale) return 1;
    return new Date(b.lastCommitDate) - new Date(a.lastCommitDate);
  });

  const displayedBranches = sortedBranches.slice(0, 10);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
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
        <h3 className="text-lg font-semibold text-gray-900">Branches</h3>
        <span className="text-sm text-gray-500">{branches.length} total</span>
      </div>
      
      {displayedBranches.length === 0 ? (
        <p className="text-gray-500 text-sm">No branches found</p>
      ) : (
        <div className="space-y-3">
          {displayedBranches.map((branch) => (
            <div
              key={branch.name}
              className={`flex items-center justify-between p-3 rounded-lg ${
                branch.isStale ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <svg
                  className={`w-4 h-4 ${branch.isStale ? 'text-red-500' : 'text-gray-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <div>
                  <span className="font-medium text-gray-900">{branch.name}</span>
                  {branch.isStale && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                      Stale
                    </span>
                  )}
                  {branch.hasOpenPR && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                      Has PR
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">{formatDate(branch.lastCommitDate)}</div>
                <div className="text-xs text-gray-400">{branch.lastCommitAuthor}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {branches.length > 10 && (
        <p className="mt-3 text-sm text-gray-500 text-center">
          +{branches.length - 10} more branches
        </p>
      )}
    </div>
  );
}

export default BranchList;
