import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { analyzeCommit } from '../utils/api';

/**
 * CommitAnalyzer Component
 * Compact, scannable AI-powered commit diff analysis
 */
function CommitAnalyzer({ owner, repo }) {
  const [sha, setSha] = useState('');

  const mutation = useMutation({
    mutationFn: () => analyzeCommit(owner, repo, sha.trim()),
  });

  const handleAnalyze = (e) => {
    e.preventDefault();
    if (sha.trim().length >= 7) {
      mutation.mutate();
    }
  };

  const result = mutation.data;

  const typeConfig = {
    feature:  { color: 'bg-blue-100 text-blue-800', label: 'Feature' },
    bugfix:   { color: 'bg-red-100 text-red-800', label: 'Bug Fix' },
    refactor: { color: 'bg-purple-100 text-purple-800', label: 'Refactor' },
    config:   { color: 'bg-gray-100 text-gray-700', label: 'Config' },
    test:     { color: 'bg-teal-100 text-teal-800', label: 'Test' },
    docs:     { color: 'bg-yellow-100 text-yellow-800', label: 'Docs' },
    minor:    { color: 'bg-gray-100 text-gray-500', label: 'Minor' },
    unknown:  { color: 'bg-gray-100 text-gray-500', label: 'Unknown' },
  };

  const impactConfig = {
    low:    { color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500' },
    medium: { color: 'text-yellow-700 bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' },
    high:   { color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
  };

  const tc = typeConfig[result?.type] || typeConfig.unknown;
  const ic = impactConfig[result?.changeImpact] || impactConfig.medium;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
      {/* Header with SHA input */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <svg className="w-5 h-5 mr-2 text-pulse-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Commit Analyzer
        </h3>
        <form onSubmit={handleAnalyze} className="flex space-x-3">
          <input
            type="text"
            value={sha}
            onChange={(e) => setSha(e.target.value)}
            placeholder="Paste a commit SHA..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-mono
                       focus:ring-2 focus:ring-pulse-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={mutation.isPending || sha.trim().length < 7}
            className="px-5 py-2 bg-pulse-600 text-white rounded-lg text-sm font-medium
                       hover:bg-pulse-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
      </div>

      {/* Loading */}
      {mutation.isPending && (
        <div className="px-6 py-8 flex items-center justify-center space-x-3 text-gray-500">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Reading diff and running AI analysis...</span>
        </div>
      )}

      {/* Error */}
      {mutation.isError && !mutation.isPending && (
        <div className="px-6 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {mutation.error?.message || 'Analysis failed.'}
          </div>
        </div>
      )}

      {/* Results */}
      {result && !mutation.isPending && (
        <div className="px-6 py-5">
          {/* Top row: badges + meta */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${tc.color}`}>
                {tc.label}
              </span>
              <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${ic.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ic.dot}`} />
                <span>{result.changeImpact} impact</span>
              </span>
            </div>
            <span className="text-xs text-gray-400">
              <code className="font-mono">{result.commitMeta?.sha?.substring(0, 7)}</code>
              {' by '}{result.commitMeta?.author}
              {' · '}{result.filesAnalyzed} files
              {result.cached && ' · cached'}
            </span>
          </div>

          {/* Headline */}
          <h4 className="text-base font-semibold text-gray-900 mb-4">
            {result.headline}
          </h4>

          {/* File changes table */}
          {result.fileChanges && result.fileChanges.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Changes</div>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                {result.fileChanges.map((fc, i) => (
                  <div key={i} className="flex items-start px-3 py-2 text-sm hover:bg-gray-50">
                    <code className="text-xs font-mono text-pulse-700 bg-pulse-50 px-1.5 py-0.5 rounded flex-shrink-0 mr-3 mt-0.5">
                      {fc.file}
                    </code>
                    <span className="text-gray-600">{fc.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key insight */}
          {result.keyInsight && (
            <div className="flex items-start space-x-2 bg-gray-50 rounded-lg px-4 py-3">
              <svg className="w-4 h-4 text-pulse-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-sm text-gray-700">{result.keyInsight}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

CommitAnalyzer.propTypes = {
  owner: PropTypes.string.isRequired,
  repo: PropTypes.string.isRequired,
};

export default CommitAnalyzer;
