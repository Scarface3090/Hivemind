import { useState, useEffect } from 'react'
import { useNavigationStore, ROUTES } from '../stores/navigationStore'
import { useGameStore } from '../stores/gameStore'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { SpectrumDisplay } from '../components/SpectrumDisplay'

export function HostSetupScreen() {
  const navigate = useNavigationStore((state) => state.navigate)
  const { hostSpectrum, isLoading, error, generateHostSpectrum, createGameWithClue, clearError } = useGameStore()
  const [clue, setClue] = useState('')

  // Generate spectrum on mount
  useEffect(() => {
    if (!hostSpectrum && !isLoading) {
      // Calls Devvit server: POST /api/drafts
      generateHostSpectrum()
    }
  }, [hostSpectrum, isLoading, generateHostSpectrum])

  const handleSubmit = async () => {
    if (!clue.trim()) return
    
    // Calls Devvit server: POST /api/games
    await createGameWithClue({ clue: clue.trim() })
    
    // Navigate to game screen if successful
    if (!useGameStore.getState().error) {
      navigate(ROUTES.GAME)
    }
  }

  const handleBack = () => {
    navigate(ROUTES.HOME)
  }

  const handleRetry = () => {
    clearError()
    generateHostSpectrum()
  }

  // Phase 1: Loading State
  if (isLoading && !hostSpectrum) {
    return (
      <div className="min-h-screen bg-[#0b141c] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <LoadingSpinner message="Generating your spectrum..." />
          <button
            onClick={handleBack}
            className="px-6 py-3 rounded-lg border border-gray-600 text-white hover:bg-gray-800 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  // Phase 2: Error State
  if (error && !hostSpectrum) {
    return (
      <div className="min-h-screen bg-[#0b141c] flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <ErrorMessage 
            message={error}
            onRetry={handleRetry}
          />
          <button
            onClick={handleBack}
            className="w-full px-6 py-3 rounded-lg border border-gray-600 text-white hover:bg-gray-800 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  // Phase 3: Spectrum Display + Clue Input
  return (
    <div className="min-h-screen bg-[#0b141c] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Host a New Game</h1>
          <p className="text-gray-400 text-sm">
            Provide a clue that points to somewhere on this spectrum
          </p>
        </div>

        {/* Spectrum Display */}
        {hostSpectrum && (
          <SpectrumDisplay 
            spectrum={hostSpectrum}
            showTitle={false}
            size="lg"
          />
        )}

        {/* Clue Input */}
        <div className="space-y-2">
          <label className="block text-white text-sm font-medium">
            Your clue:
          </label>
          <textarea
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            placeholder="e.g., The movie 'Parasite'"
            className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-800 text-white resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
            maxLength={200}
          />
          <div className="text-sm text-gray-400 text-right">
            {clue.length}/200 characters
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <ErrorMessage 
            message={error}
            onClose={clearError}
          />
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 px-6 py-3 rounded-lg border border-gray-600 text-white hover:bg-gray-800 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={!clue.trim() || isLoading}
            className="flex-1 px-6 py-3 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Starting...' : 'Start Game'}
          </button>
        </div>
      </div>
    </div>
  )
}