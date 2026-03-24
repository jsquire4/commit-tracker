import { Link } from 'react-router-dom';
import { GrowthAreaManager } from '@/features/growth-areas/GrowthAreaManager';

interface MyStoryEmptyStateProps {
  hasGrowthAreas: boolean;
}

export function MyStoryEmptyState({ hasGrowthAreas }: MyStoryEmptyStateProps) {
  if (!hasGrowthAreas) {
    return (
      <div
        className="flex flex-col items-center text-center py-16 px-6 animate-fade-up"
        style={{ animationDelay: '80ms' }}
      >
        {/* Decorative icon */}
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-accent"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
        </div>

        <h2 className="font-serif text-2xl text-on-surface font-normal mb-3">
          Your story starts with your goals
        </h2>
        <p className="text-body text-on-surface-variant max-w-sm mb-8">
          Add up to 5 personal growth areas to start tracking how your work connects to your
          development. Your story builds from there.
        </p>

        <div className="w-full max-w-sm text-left">
          <GrowthAreaManager />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center text-center py-16 px-6 animate-fade-up"
      style={{ animationDelay: '80ms' }}
    >
      {/* Decorative icon */}
      <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-6">
        <svg
          className="w-8 h-8 text-on-surface-variant"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h2 className="font-serif text-2xl text-on-surface font-normal mb-3">
        Your story builds week by week
      </h2>
      <p className="text-body text-on-surface-variant max-w-sm mb-6">
        As you complete and close weeks, your growth pattern will appear here — including
        engagement trends, work mix, and AI-generated career highlights.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-accent text-white text-body font-medium transition-colors hover:bg-accent-dark"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Head to My Week
      </Link>
    </div>
  );
}
