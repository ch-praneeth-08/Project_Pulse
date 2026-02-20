import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * BlockerPanel Component
 * Displays detected blockers as an alert-style panel on the dashboard
 */
function BlockerPanel({ blockers }) {
  const [expanded, setExpanded] = useState(false);

  if (!blockers || blockers.length === 0) return null;

  const severityColors = {
    high: { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-100 text-red-800' },
    medium: { bg: 'bg-amber-50', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-800' },
    low: { bg: 'bg-gray-50', border: 'border-gray-300', badge: 'bg-gray-100 text-gray-700' }
  };

  const highCount = blockers.filter(b => b.severity === 'high').length;
  const displayBlockers = expanded ? blockers : blockers.slice(0, 3);
  const hasMore = blockers.length > 3;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden mb-6">
      {/* Header */}
      <div className="px-6 py-4 bg-red-50 border-b border-red-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-red-900">
            Potential Blockers
          </h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            {blockers.length} detected
          </span>
        </div>
        {highCount > 0 && (
          <span className="text-sm text-red-700 font-medium">
            {highCount} high severity
          </span>
        )}
      </div>

      {/* Blocker cards */}
      <div className="p-6 space-y-3">
        {displayBlockers.map((blocker, index) => {
          const colors = severityColors[blocker.severity] || severityColors.medium;
          return (
            <div key={index} className={`p-4 rounded-lg ${colors.bg} border ${colors.border}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors.badge}`}>
                      {blocker.severity}
                    </span>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      {blocker.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{blocker.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{blocker.description}</p>
                  <p className="text-sm text-pulse-700 mt-2 font-medium">
                    Suggested: {blocker.suggestedAction}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-center text-sm text-red-700 hover:text-red-900 font-medium py-2"
          >
            {expanded ? 'Show less' : `Show ${blockers.length - 3} more blockers`}
          </button>
        )}
      </div>
    </div>
  );
}

BlockerPanel.propTypes = {
  blockers: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string.isRequired,
    severity: PropTypes.oneOf(['high', 'medium', 'low']).isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    suggestedAction: PropTypes.string.isRequired
  }))
};

export default BlockerPanel;
