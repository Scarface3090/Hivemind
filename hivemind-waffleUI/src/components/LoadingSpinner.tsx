interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div 
        className={`animate-spin border-2 border-orange-500 border-t-transparent rounded-full ${sizeClasses[size]}`}
      />
      {message && <p className="text-white text-sm">{message}</p>}
    </div>
  )
}