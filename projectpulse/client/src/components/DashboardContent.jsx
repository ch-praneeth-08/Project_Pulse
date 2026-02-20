import RepoHeader from './RepoHeader';
import StatsGrid from './StatsGrid';
import ActivityHeatmap from './ActivityHeatmap';
import BranchList from './BranchList';
import PullRequestList from './PullRequestList';
import IssueList from './IssueList';
import ContributorList from './ContributorList';

function DashboardContent({ data, onAnalyzeCommit }) {
  const { meta, commits, branches, pullRequests, issues, contributors, cached } = data;

  return (
    <div className="space-y-6">
      {/* Repository Header */}
      <RepoHeader meta={meta} cached={cached} />

      {/* Stats Grid */}
      <StatsGrid
        commits={commits}
        branches={branches}
        pullRequests={pullRequests}
        issues={issues}
        contributors={contributors}
      />

      {/* Activity Heatmap Placeholder */}
      <ActivityHeatmap commits={commits} contributors={contributors} />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branches */}
        <BranchList branches={branches} />

        {/* Pull Requests */}
        <PullRequestList pullRequests={pullRequests} />

        {/* Issues */}
        <IssueList issues={issues} />

        {/* Contributors */}
        <ContributorList
          contributors={contributors}
          commits={commits}
          owner={meta.owner}
          repo={meta.name}
          onAnalyzeCommit={onAnalyzeCommit}
        />
      </div>
    </div>
  );
}

export default DashboardContent;
