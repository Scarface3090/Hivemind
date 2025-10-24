

interface ContentErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onReload?: () => void;
  isRetrying?: boolean;
  showReload?: boolean;
}

export const ContentErrorMessage = ({
  title = 'Content Loading Failed',
  message,
  onRetry,
  onReload,
  isRetrying = false,
  showReload = true,
}: ContentErrorMessageProps): JSX.Element => {
  return (
    <div className="content-error-message">
      <div className="content-error-message__icon" aria-hidden="true">
        ⚠️
      </div>
      <div className="content-error-message__content">
        <h3 className="content-error-message__title">{title}</h3>
        <p className="content-error-message__text">{message}</p>
        <div className="content-error-message__actions">
          {onRetry && (
            <button
              type="button"
              className="pill-button"
              onClick={onRetry}
              disabled={isRetrying}
            >
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </button>
          )}
          {showReload && onReload && (
            <button
              type="button"
              className="pill-button pill-button--secondary"
              onClick={onReload}
            >
              Reload Page
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentErrorMessage;
