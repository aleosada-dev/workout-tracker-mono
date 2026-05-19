import { Component, type ErrorInfo, Fragment, type ReactNode } from 'react';
import { observability } from './adapter';
import { FallbackErrorScreen } from './fallback-error-screen';

type Props = { children: ReactNode };
type State = { hasError: boolean; resetKey: number };

export class ObservabilityErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    observability.captureException(error, {
      tags: { source: 'react_error_boundary' },
      extra: { componentStack: info.componentStack ?? '<no stack>' },
    });
  }

  reset = () => {
    this.setState((prev) => ({ hasError: false, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return <FallbackErrorScreen onRetry={this.reset} />;
    }
    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}
