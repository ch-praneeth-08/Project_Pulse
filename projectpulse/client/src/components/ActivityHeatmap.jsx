function ActivityHeatmap({ commits, contributors }) {
  // Generate last 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split('T')[0]);
  }

  // Aggregate commits by day
  const commitsByDay = {};
  days.forEach(day => {
    commitsByDay[day] = 0;
  });

  commits.forEach(commit => {
    const day = new Date(commit.date).toISOString().split('T')[0];
    if (commitsByDay[day] !== undefined) {
      commitsByDay[day]++;
    }
  });

  const maxCommits = Math.max(...Object.values(commitsByDay), 1);

  const getIntensityClass = (count) => {
    if (count === 0) return 'bg-gray-100';
    const intensity = count / maxCommits;
    if (intensity > 0.75) return 'bg-pulse-600';
    if (intensity > 0.5) return 'bg-pulse-400';
    if (intensity > 0.25) return 'bg-pulse-300';
    return 'bg-pulse-200';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Activity (Last 7 Days)
      </h3>
      <div className="flex items-end justify-between space-x-2 h-32">
        {days.map((day) => (
          <div key={day} className="flex-1 flex flex-col items-center">
            <div
              className={`w-full rounded-t-md transition-all ${getIntensityClass(commitsByDay[day])}`}
              style={{
                height: `${Math.max((commitsByDay[day] / maxCommits) * 100, 8)}%`,
                minHeight: commitsByDay[day] > 0 ? '20px' : '8px'
              }}
              title={`${commitsByDay[day]} commits on ${formatDate(day)}`}
            />
            <div className="mt-2 text-xs text-gray-500 text-center">
              {new Date(day).toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className="text-xs font-medium text-gray-700">
              {commitsByDay[day]}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>Total: {commits.length} commits</span>
        <div className="flex items-center space-x-2">
          <span className="text-xs">Less</span>
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-gray-100 rounded" />
            <div className="w-3 h-3 bg-pulse-200 rounded" />
            <div className="w-3 h-3 bg-pulse-300 rounded" />
            <div className="w-3 h-3 bg-pulse-400 rounded" />
            <div className="w-3 h-3 bg-pulse-600 rounded" />
          </div>
          <span className="text-xs">More</span>
        </div>
      </div>
    </div>
  );
}

export default ActivityHeatmap;
