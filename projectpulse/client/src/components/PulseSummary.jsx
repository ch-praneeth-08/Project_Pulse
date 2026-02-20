import PropTypes from 'prop-types';

/**
 * PulseSummary Component
 * Displays the AI-generated health summary for a repository
 */
function PulseSummary({ summary, summaryError }) {
  // Show error state if summary is null but we have an error
  if (!summary && summaryError) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-3 text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">Summary unavailable — GitHub data loaded successfully.</span>
        </div>
        {summaryError.includes('Ollama') && (
          <p className="mt-2 text-xs text-gray-400">{summaryError}</p>
        )}
      </div>
    );
  }

  // Don't render if no summary at all
  if (!summary) {
    return null;
  }

  // Health status colors
  const healthColors = {
    Healthy: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    },
    'At Risk': {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    },
    Critical: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )
    }
  };

  const healthStyle = healthColors[summary.overallHealth] || healthColors['At Risk'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
      {/* Health Badge & Headline */}
      <div className="p-6 pb-4">
        {/* Health Status Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${healthStyle.bg} ${healthStyle.text} ${healthStyle.border} border`}>
            {healthStyle.icon}
            <span className="font-semibold">{summary.overallHealth}</span>
          </div>
          <div className="flex items-center text-gray-400 text-sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>AI Analysis</span>
          </div>
        </div>

        {/* Headline */}
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          {summary.headline}
        </h2>

        {/* Summary Paragraph */}
        <p className="text-gray-600 leading-relaxed">
          {summary.summary}
        </p>
      </div>

      {/* Highlights & Concerns Grid */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Highlights Section */}
          {summary.highlights && summary.highlights.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Highlights
              </h3>
              <ul className="space-y-2">
                {summary.highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-green-700">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerns Section - Only show if there are concerns */}
          {summary.concerns && summary.concerns.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Concerns
              </h3>
              <ul className="space-y-2">
                {summary.concerns.map((concern, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-amber-700">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{concern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* AI Blockers Section - Full width below highlights/concerns */}
        {summary.blockers && summary.blockers.length > 0 && (
          <div className="mt-4 bg-red-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-red-800 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
              </svg>
              Blockers Detected
            </h3>
            <ul className="space-y-2">
              {summary.blockers.map((blocker, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm text-red-700">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{blocker}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendation Callout */}
      {summary.recommendation && (
        <div className="mx-6 mb-6 bg-gradient-to-r from-pulse-50 to-indigo-50 border border-pulse-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-pulse-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-pulse-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-pulse-800 mb-1">Recommendation</h3>
              <p className="text-sm text-pulse-700">{summary.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

PulseSummary.propTypes = {
  summary: PropTypes.shape({
    overallHealth: PropTypes.oneOf(['Healthy', 'At Risk', 'Critical']),
    headline: PropTypes.string,
    summary: PropTypes.string,
    highlights: PropTypes.arrayOf(PropTypes.string),
    concerns: PropTypes.arrayOf(PropTypes.string),
    blockers: PropTypes.arrayOf(PropTypes.string),
    recommendation: PropTypes.string
  }),
  summaryError: PropTypes.string
};

export default PulseSummary;
