
import { useState } from 'react'
import { SLIDER_MIN, SLIDER_MAX, SLIDER_STEP } from '../constants'

interface GuessSliderProps {
  value: number
  onChange: (value: number) => void
  spectrum: [string, string]
  disabled?: boolean
}

export function GuessSlider({ value, onChange, spectrum, disabled = false }: GuessSliderProps) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-300">
        <span>Your Guess</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      
      <div className="relative">
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={SLIDER_STEP}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          disabled={disabled}
          className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${
            isDragging ? 'scale-110' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            background: `linear-gradient(to right, #f97316 0%, #fb923c ${value}%, #374151 ${value}%, #374151 100%)`
          }}
        />
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="max-w-[40%] truncate">{spectrum[0]}</span>
        <span className="max-w-[40%] truncate text-right">{spectrum[1]}</span>
      </div>
    </div>
  )
}
