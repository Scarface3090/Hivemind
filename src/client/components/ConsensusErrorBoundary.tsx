import React, { Component, ReactNode } from 'react';
import { colors, spacing } from '../styles/tokens.js';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically for consensus-related components.
 * Prevents consensus calculation errors from breaking the entire results page.
 */
export class ConsensusErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging
    console.error('[ConsensusErrorBoundary] Consensus component error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      // Fallback UI that matches the design system
      return (
        <div 
          className="card" 
          style={{ 
            padding: spacing.md, 
            borderRadius: 12, 
            background: colors.backgroundOverlay,
            color: colors.lightGray,
            textAlign: 'center' as const,
            width: '100%',
            maxWidth: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm
          }}
          role="alert"
        >
          <span aria-hidden="true" style={{ fontSize: '16px' }}>⚠️</span>
          <span>Consensus calculation unavailable</span>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ConsensusErrorBoundary;
