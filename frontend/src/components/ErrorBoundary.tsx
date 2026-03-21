import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
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
  }

  private handleRetry = () => {
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
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
