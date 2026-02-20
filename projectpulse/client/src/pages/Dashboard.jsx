import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import RepoInput from '../components/RepoInput';
import LoadingState from '../components/LoadingState';
import ErrorDisplay from '../components/ErrorDisplay';
import DashboardContent from '../components/DashboardContent';
import PulseSummary from '../components/PulseSummary';
import ContributorHeatmap from '../components/ContributorHeatmap';
import BlockerPanel from '../components/BlockerPanel';
import ChatPanel from '../components/ChatPanel';
import { fetchPulseData } from '../utils/api';

function Dashboard() {
  const [pulseData, setPulseData] = useState(null);

  const pulseMutation = useMutation({
    mutationFn: fetchPulseData,
    onSuccess: (data) => {
      setPulseData(data);
    },
  });

  const handleSubmit = (repoUrl) => {
    pulseMutation.mutate(repoUrl);
  };

  const handleReset = () => {
    setPulseData(null);
    pulseMutation.reset();
  };

  // Extract repoData from the response (supports both old and new API format)
  // New format: { repoData: {...}, summary: {...}, summaryError: string }
  // Old format: { meta: {...}, commits: [...], ... }
  const repoData = pulseData?.repoData || (pulseData?.meta ? pulseData : null);
  const summary = pulseData?.summary || null;
  const summaryError = pulseData?.summaryError || null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pulse-500 to-pulse-700 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
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
              <h1 className="text-xl font-bold text-gray-900">ProjectPulse</h1>
            </div>
            {repoData && (
              <button
                onClick={handleReset}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span>New repo</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Empty State - URL Input */}
        {!repoData && !pulseMutation.isPending && !pulseMutation.isError && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Check your repo's pulse
              </h2>
              <p className="text-lg text-gray-600 max-w-md">
                Enter any public GitHub repository URL to get an intelligent health
                summary, activity insights, and blocker detection.
              </p>
            </div>
            <RepoInput onSubmit={handleSubmit} isLoading={pulseMutation.isPending} />
          </div>
        )}

        {/* Loading State */}
        {pulseMutation.isPending && <LoadingState />}

        {/* Error State */}
        {pulseMutation.isError && (
          <ErrorDisplay
            error={pulseMutation.error}
            onRetry={() => handleSubmit(pulseMutation.variables)}
            onReset={handleReset}
          />
        )}

        {/* Dashboard Content */}
        {repoData && !pulseMutation.isPending && (
          <>
            <div className="mb-6">
              <RepoInput
                onSubmit={handleSubmit}
                isLoading={pulseMutation.isPending}
                initialValue={repoData.meta?.fullName || ''}
                compact
              />
            </div>
            
            {/* AI-Generated Pulse Summary */}
            <PulseSummary summary={summary} summaryError={summaryError} />

            {/* Blocker Detection Panel */}
            <BlockerPanel blockers={repoData.blockers} />

            {/* Contributor Activity Heatmap */}
            <ContributorHeatmap contributors={repoData.contributors} />
            
            {/* Detailed Dashboard Content */}
            <DashboardContent data={repoData} />
          </>
        )}
      </main>

      {/* Floating Chat Panel */}
      {repoData && <ChatPanel repoData={repoData} />}
    </div>
  );
}

export default Dashboard;
