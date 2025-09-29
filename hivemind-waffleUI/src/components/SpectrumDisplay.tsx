interface SpectrumDisplayProps {
  spectrum: [string, string]
  showTitle?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function SpectrumDisplay({ spectrum, showTitle = true, size = 'md' }: SpectrumDisplayProps) {
  const sizeClasses = {
    sm: {
      container: 'p-3',
      title: 'text-xs mb-1',
      spectrum: 'text-sm',
      arrow: 'text-xs'
    },
    md: {
      container: 'p-4',
      title: 'text-sm mb-2',
      spectrum: 'text-base',
      arrow: 'text-sm'
    },
    lg: {
      container: 'p-6',
      title: 'text-lg mb-3',
      spectrum: 'text-xl',
      arrow: 'text-base'
    }
  }

  const classes = sizeClasses[size]

  return (
    <div className={`bg-gray-800 rounded-lg border-2 border-orange-500/20 ${classes.container}`}>
      {showTitle && (
        <div className={`text-gray-300 font-medium ${classes.title}`}>
          Spectrum
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className={`text-white font-medium ${classes.spectrum}`}>
          {spectrum[0]}
        </span>
        <div className="flex-1 mx-4 relative">
          <div className="h-px bg-gradient-to-r from-orange-500 to-orange-300"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-orange-400 bg-gray-800 px-2 ${classes.arrow}`}>
              ⟵ ⟶
            </span>
          </div>
        </div>
        <span className={`text-white font-medium ${classes.spectrum}`}>
          {spectrum[1]}
        </span>
      </div>
    </div>
  )
}