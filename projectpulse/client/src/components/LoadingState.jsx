function LoadingState() {
  const steps = [
    'Connecting to GitHub...',
    'Fetching repository data...',
    'Analyzing commits and branches...',
    'Processing pull requests...',
    'Gathering contributor stats...',
    'Generating AI health summary...',
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="relative">
        {/* Pulse animation */}
        <div className="w-24 h-24 relative">
          <div className="absolute inset-0 bg-pulse-500 rounded-full opacity-20 animate-ping" />
          <div className="absolute inset-2 bg-pulse-500 rounded-full opacity-40 animate-ping animation-delay-150" />
          <div className="absolute inset-4 bg-pulse-500 rounded-full opacity-60 animate-ping animation-delay-300" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-pulse-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Analyzing Repository
        </h3>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className="flex items-center justify-center space-x-2 text-gray-600 animate-pulse"
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <div className="w-2 h-2 bg-pulse-500 rounded-full" />
              <span className="text-sm">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoadingState;
