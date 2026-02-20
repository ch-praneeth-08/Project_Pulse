function StatsGrid({ commits, branches, pullRequests, issues, contributors }) {
  const staleBranches = branches.filter(b => b.isStale).length;
  const activeContributors = contributors.filter(c => 
    Object.keys(c.commitsByDay || {}).length > 0
  ).length;

  const stats = [
    {
      label: 'Commits (7d)',
      value: commits.length,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'Open PRs',
      value: pullRequests.length,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      color: 'bg-green-50 text-green-600'
    },
    {
      label: 'Open Issues',
      value: issues.length,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-yellow-50 text-yellow-600'
    },
    {
      label: 'Branches',
      value: branches.length,
      subValue: staleBranches > 0 ? `${staleBranches} stale` : null,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: staleBranches > 0 ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'
    },
    {
      label: 'Active Contributors',
      value: activeContributors,
      subValue: `${contributors.length} total`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'bg-indigo-50 text-indigo-600'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
          {stat.subValue && (
            <div className="text-xs text-gray-500 mt-1">{stat.subValue}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default StatsGrid;
