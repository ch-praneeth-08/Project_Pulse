function ErrorDisplay({ error, onRetry, onReset }) {
  // Parse error message
  const errorData = error?.response?.data || error?.data || {};
  const errorMessage = errorData.error || error?.message || 'An unexpected error occurred';
  const errorCode = errorData.code || 'UNKNOWN_ERROR';

  const getErrorDetails = () => {
    switch (errorCode) {
      case 'REPO_NOT_FOUND':
        return {
          title: 'Repository Not Found',
          description: 'The repository could not be found. Please check the URL and make sure the repository exists and is public.',
          icon: (
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      case 'RATE_LIMITED':
        return {
          title: 'Rate Limit Exceeded',
          description: 'GitHub API rate limit has been reached. Please wait a few minutes and try again.',
          icon: (
            <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      case 'ACCESS_DENIED':
        return {
          title: 'Access Denied',
          description: 'This repository appears to be private. ProjectPulse only works with public repositories.',
          icon: (
            <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )
        };
      case 'INVALID_URL':
        return {
          title: 'Invalid Repository URL',
          description: 'Please enter a valid GitHub repository URL (e.g., facebook/react or https://github.com/facebook/react).',
          icon: (
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        };
      default:
        return {
          title: 'Something Went Wrong',
          description: errorMessage,
          icon: (
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
    }
  };

  const { title, description, icon } = getErrorDetails();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">{icon}</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{description}</p>
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={onRetry}
            className="px-4 py-2 text-white bg-pulse-600 rounded-lg hover:bg-pulse-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Enter New URL
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorDisplay;
