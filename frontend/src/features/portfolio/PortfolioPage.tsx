/**
 * PortfolioPage — Two-column layout (70%/30%).
 *
 * Main column: page header with "Portfolio Overview" + CycleHistorySelector,
 * PortfolioNarrativeCard, PortfolioMetricsStrip, CompanyCard grid, ComparisonTable.
 * Sidebar: AIChatSidebar.
 *
 * Fetches portfolio data from stub API.
 */
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { VP_AND_ABOVE } from '@/constants/roles';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useCurrentCycle } from '@/hooks/useCycle';
import { CycleHistorySelector } from '@/features/my-week/CycleHistorySelector';
import { AIChatSidebar } from '@/components/AIChatSidebar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { PortfolioNarrativeCard } from './PortfolioNarrativeCard';
import { PortfolioMetricsStrip } from './PortfolioMetricsStrip';
import { CompanyCard } from './CompanyCard';
import { ComparisonTable } from './ComparisonTable';
import type { ChatMessage } from '@/hooks/useAIChat';

/** Seed conversation for the AI sidebar */
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'seed-1',
    role: 'user',
    text: 'Which company needs the most attention right now?',
    timestamp: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: 'seed-2',
    role: 'ai',
    text: 'Apex Dynamics is the primary concern. Strategic alignment has dropped 12 points over 4 weeks to 28%, and their carry-forward rate of 32% is the highest in the portfolio. Their \u2018Revenue Diversification\u2019 rally cry has zero commitments\u2009\u2014\u2009no one is working on it. I\u2019d recommend a management review focused on why alignment is declining and whether the current leadership team has capacity.',
    timestamp: new Date(Date.now() - 100_000).toISOString(),
  },
  {
    id: 'seed-3',
    role: 'user',
    text: 'Compare Meridian and Cascade on execution quality',
    timestamp: new Date(Date.now() - 60_000).toISOString(),
  },
  {
    id: 'seed-4',
    role: 'ai',
    text: 'Meridian is more mature (Week 6) with solid coverage at 88% but declining alignment (41%, down from 48%). Their main gap is Churn Reduction with only 1 commitment. Cascade is early (Week 2) but showing strong signals\u2009\u2014\u200955% strategic alignment and 85% completion rate. The key difference: Meridian\u2019s teams are busy but drifting from strategy, while Cascade\u2019s smaller team is tightly aligned. Cascade\u2019s risk is that this is only 2 weeks of data.',
    timestamp: new Date(Date.now() - 40_000).toISOString(),
  },
];

export function PortfolioPage() {
  const { role } = useAuth();

  // Role guard — VP and above only
  if (!role || !VP_AND_ABOVE.has(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <h1 className="text-title font-medium text-on-surface">Access Restricted</h1>
        <p className="text-body text-on-surface-variant max-w-sm">
          The Portfolio view is only accessible to VPs and Executives.
        </p>
      </div>
    );
  }

  const { data: cycle } = useCurrentCycle();
  const [selectedCycleId, setSelectedCycleId] = useState<string | undefined>(undefined);
  const activeCycleId = selectedCycleId ?? cycle?.id;
  const { data: portfolio, isLoading, isError, error } = usePortfolio(activeCycleId);

  if (isLoading) {
    return <LoadingSpinner size="lg" fullPage label="Loading portfolio..." />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Card padding="spacious" className="max-w-md">
          <h1 className="font-serif text-headline text-on-surface mb-2">Failed to Load Portfolio</h1>
          <p className="text-body text-on-surface-variant mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred while loading portfolio data.'}
          </p>
          <Button variant="primary" onClick={() => { window.location.reload(); }}>Retry</Button>
        </Card>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <h1 className="font-serif text-headline text-on-surface">Portfolio</h1>
        <p className="text-body text-on-surface-variant">No portfolio data available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8 grid grid-cols-[70%_30%] gap-8 items-start">
      {/* Main column */}
      <div className="flex flex-col gap-8">
        {/* Page header with week selector */}
        <div className="flex items-center gap-6">
          <h1 className="font-serif text-[1.25rem] text-on-surface font-normal">
            Portfolio Overview
          </h1>
          {cycle && (
            <CycleHistorySelector
              currentCycleId={activeCycleId ?? cycle.id}
              onSelect={setSelectedCycleId}
            />
          )}
        </div>

        {/* Narrative card */}
        <PortfolioNarrativeCard narrative={portfolio.narrative} />

        {/* Metrics strip */}
        <PortfolioMetricsStrip metrics={portfolio.metrics} />

        {/* Company cards */}
        <div className="flex flex-col gap-6">
          {portfolio.companies.map((company, i) => (
            <CompanyCard
              key={company.orgId}
              company={company}
              animationDelay={200 + i * 40}
            />
          ))}
        </div>

        {/* Comparison table */}
        <ComparisonTable
          rows={portfolio.comparison}
          animationDelay={320}
        />

        {/* Footer */}
        <div
          className="text-center text-[0.75rem] text-muted pt-4 animate-fade-up"
          style={{ animationDelay: '520ms' }}
        >
          Portfolio data aggregated from individual company briefings. Click any company to view its full briefing.
        </div>
      </div>

      {/* Sidebar — AI Chat */}
      <div className="sticky top-[120px]" style={{ height: 'calc(100vh - 140px)' }}>
        <div
          className="h-full animate-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          <AIChatSidebar
            context="portfolio"
            placeholder="Ask about the portfolio..."
            footerText="Powered by AI · Portfolio-wide analysis"
            initialMessages={INITIAL_MESSAGES}
          />
        </div>
      </div>
    </div>
  );
}
