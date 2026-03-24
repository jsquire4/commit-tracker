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
import { CycleHistorySelector } from '@/features/shared/CycleHistorySelector';
import { AIChatSidebar } from '@/components/AIChatSidebar';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { PortfolioNarrativeCard } from './PortfolioNarrativeCard';
import { PortfolioMetricsStrip } from './PortfolioMetricsStrip';
import { CompanyCard } from './CompanyCard';
import { ComparisonTable } from './ComparisonTable';
// No seed messages — chat starts fresh each session

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
    return (
      <div className="max-w-[1280px] mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-[70%_30%] gap-8">
        <div className="flex flex-col gap-8">
          <div className="h-8 w-40 bg-surface-lowest rounded animate-pulse" />
          <div className="h-48 bg-surface-lowest rounded-sm animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            {[0,1,2,3].map(i => <div key={i} className="h-20 bg-surface-lowest rounded-sm animate-pulse" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[0,1,2].map(i => <div key={i} className="h-64 bg-surface-lowest rounded-sm animate-pulse" />)}
          </div>
        </div>
        <div className="h-96 bg-surface-lowest rounded-sm animate-pulse" />
      </div>
    );
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
    <div className="max-w-[1280px] mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-[70%_30%] gap-8 items-stretch">
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
      <div className="flex flex-col">
        <div className="flex-grow" />
        <div
          className="sticky bottom-8 animate-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          <AIChatSidebar
            context="portfolio"
            placeholder="Ask about the portfolio..."
            footerText="Powered by AI · Portfolio-wide analysis"
            primerMessage="I can help you compare portfolio companies on alignment, completion, drift, and coverage. What would you like to explore?"
          />
        </div>
      </div>
    </div>
  );
}
