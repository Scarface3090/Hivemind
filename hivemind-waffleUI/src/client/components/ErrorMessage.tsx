
interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  onClose?: () => void
}

export function ErrorMessage({ message, onRetry, onClose }: ErrorMessageProps) {
  return (
    <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="text-red-400 font-medium mb-1">Error</h3>
          <p className="text-red-300 text-sm">{message}</p>
        </div>
        <div className="flex gap-2">
          {onRetry && (
            <button 
              onClick={onRetry}
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              Retry
            </button>
          )}
          {onClose && (
            <button 
              onClick={onClose}
              className="px-3 py-1 text-xs border border-red-500/30 hover:bg-red-500/10 text-red-300 rounded transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
