import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getContexts } from '../api/games.js';
import { ContentErrorMessage } from './ContentErrorMessage.js';

interface ContextSelectorProps {
  selectedContext: string | null;
  onContextSelect: (context: string) => void;
  disabled?: boolean;
  onError?: (error: Error) => void;
}

export const ContextSelector = ({ 
  selectedContext, 
  onContextSelect, 
  disabled = false,
  onError
}: ContextSelectorProps): JSX.Element => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contexts'],
    queryFn: getContexts,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle errors via useEffect since onError is deprecated in newer versions
  React.useEffect(() => {
    if (error) {
      console.error('Failed to load contexts:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to load contexts'));
    }
  }, [error, onError]);

  if (isLoading) {
    return (
      <div className="context-selector">
        <div className="context-selector__header">
          <span className="host-form__label">Choose a context</span>
          <p className="host-form__description">
            Select the type of content you'd like to create a game about.
          </p>
        </div>
        <div className="context-selector__grid">
          {/* Loading skeleton */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="context-card context-card--loading" aria-hidden="true">
              <div className="context-card__content">
                <div className="context-card__name context-card__name--skeleton"></div>
                <div className="context-card__count context-card__count--skeleton"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="context-selector">
        <div className="context-selector__header">
          <span className="host-form__label">Choose a context</span>
          <p className="host-form__description">
            Select the type of content you'd like to create a game about.
          </p>
        </div>
        <ContentErrorMessage
          title="Failed to Load Content Categories"
          message={error instanceof Error ? error.message : 'Unable to load available content categories. Please check your connection and try again.'}
          onRetry={() => refetch()}
          onReload={() => window.location.reload()}
          isRetrying={isLoading}
        />
      </div>
    );
  }

  const contexts = data?.contexts || [];

  return (
    <div className="context-selector">
      <div className="context-selector__header">
        <span className="host-form__label">Choose a context</span>
        <p className="host-form__description">
          Select the type of content you'd like to create a game about.
        </p>
      </div>
      
      <div className="context-selector__grid">
        {contexts.map((contextSummary) => (
          <button
            key={contextSummary.context}
            type="button"
            className={`context-card ${
              selectedContext === contextSummary.context ? 'context-card--selected' : ''
            } ${disabled ? 'context-card--disabled' : ''}`}
            onClick={() => {
              if (!disabled) {
                // Optimistic UI update - immediately show selection
                onContextSelect(contextSummary.context);
              }
            }}
            disabled={disabled}
            aria-pressed={selectedContext === contextSummary.context}
          >
            <div className="context-card__content">
              <h3 className="context-card__name">{contextSummary.context}</h3>
              <p className="context-card__count">
                {contextSummary.totalCount} spectrum{contextSummary.totalCount === 1 ? '' : 's'}
              </p>
            </div>
            <div className="context-card__indicator" aria-hidden="true">
              {selectedContext === contextSummary.context ? '✓' : ''}
            </div>
          </button>
        ))}
      </div>
      
      {contexts.length === 0 && (
        <div className="context-selector__empty">
          <p className="host-form__helper">
            No contexts available. Using fallback content.
          </p>
        </div>
      )}
    </div>
  );
};

export default ContextSelector;
