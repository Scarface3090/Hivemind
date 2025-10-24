import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically for context selection components.
 * Prevents context selection errors from breaking the host flow.
 */
export class ContextSelectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ContextSelectionErrorBoundary] Context selection error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="context-selector__error">
          <div className="host-form__section">
            <div className="host-form__section-header">
              <span className="host-form__label">Content Selection Unavailable</span>
              <p className="host-form__description">
                There was an issue loading the content selection interface.
              </p>
            </div>
            <div className="context-selector__error-content">
              <p className="host-form__error">
                {this.state.error?.message || 'An unexpected error occurred while loading content options.'}
              </p>
              <div className="context-selector__error-actions">
                <button 
                  type="button" 
                  className="pill-button"
                  onClick={this.handleRetry}
                >
                  Try Again
                </button>
                <button 
                  type="button" 
                  className="pill-button pill-button--secondary"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ContextSelectionErrorBoundary;
