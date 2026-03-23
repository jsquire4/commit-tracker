import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Detects stale chunk errors from dynamic imports after a deploy.
 * These manifest as "Failed to fetch dynamically imported module" or
 * "Loading chunk X failed" errors.
 */
function isChunkLoadError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return msg.includes('dynamically imported module')
    || msg.includes('loading chunk')
    || msg.includes('failed to fetch');
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Compass error:', error, errorInfo);

    // Auto-reload on stale chunk errors (happens after deploys)
    if (isChunkLoadError(error)) {
      const reloadKey = 'compass-chunk-reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      // Only auto-reload once per minute to prevent infinite loops
      if (!lastReload || now - parseInt(lastReload, 10) > 60_000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
        return;
      }
    }
  }

  private handleRetry = () => {
    if (this.state.error && isChunkLoadError(this.state.error)) {
      // Force full reload to get fresh chunk URLs
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-error">Something went wrong</h2>
          <p className="mt-2 text-on-surface-variant">{this.state.error?.message}</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-4 px-4 py-2 text-body font-medium text-accent bg-transparent border border-accent rounded-sm hover:bg-accent/[0.06] transition-colors duration-[150ms]"
          >
            {this.state.error && isChunkLoadError(this.state.error) ? 'Reload page' : 'Try again'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
