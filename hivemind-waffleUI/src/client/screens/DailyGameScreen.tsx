
import { useEffect } from 'react'
import { useNavigationStore, ROUTES } from '../../stores/navigationStore'
import { useGameStore } from '../../stores/gameStore'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import { SpectrumDisplay } from '../../components/SpectrumDisplay'

export function DailyGameScreen() {
  const navigate = useNavigationStore((state) => state.navigate)
  const { currentGame, isLoading, error, joinDailyGame, clearError, reset } = useGameStore()

  // Load daily game on mount
  useEffect(() => {
    if (!currentGame && !isLoading) {
      // Calls Devvit server (same-origin): GET /api/daily
      joinDailyGame()
    }
  }, [currentGame, isLoading, joinDailyGame])

  const handleJoinGame = () => {
    navigate(ROUTES.GAME)
  }

  const handleBack = () => {
    reset()
    navigate(ROUTES.HOME)
  }

  const handleRetry = () => {
    clearError()
    joinDailyGame()
  }

  // Loading state
  if (isLoading && !currentGame) {
    return (
      <div className="min-h-screen bg-[#0b141c] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <LoadingSpinner message="Loading daily game..." />
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

  // Error state
  if (error && !currentGame) {
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

  // No game state
  if (!currentGame) {
    return (
      <div className="min-h-screen bg-[#0b141c] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <p className="text-gray-400">No daily game available right now.</p>
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 px-6 py-3 rounded-lg border border-gray-600 text-white hover:bg-gray-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleRetry}
              className="flex-1 px-6 py-3 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Game loaded successfully
  return (
    <div className="min-h-screen bg-[#0b141c] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Daily Challenge</h1>
          <p className="text-gray-400 text-sm">
            Join today's community challenge
          </p>
        </div>

        {/* Game Preview */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-6 space-y-4">
          {/* Clue */}
          <div>
            <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Today's Clue</h3>
            <p className="text-white text-lg font-medium">{currentGame.clue}</p>
          </div>

          {/* Spectrum */}
          <SpectrumDisplay 
            spectrum={currentGame.spectrum}
            showTitle={false}
          />

          {/* Stats */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-700">
            <div className="text-center">
              <div className="text-white font-medium">{currentGame.guesses.length}</div>
              <div className="text-xs text-gray-400">Players</div>
            </div>
            <div className="text-center">
              <div className="text-white font-medium">
                {Math.round((currentGame.endTime - Date.now()) / (1000 * 60 * 60))}h
              </div>
              <div className="text-xs text-gray-400">Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-white font-medium">Daily</div>
              <div className="text-xs text-gray-400">Challenge</div>
            </div>
          </div>
        </div>

        {/* Existing Guesses Preview */}
        {currentGame.guesses.length > 0 && (
          <div className="bg-gray-800/20 rounded-lg p-4">
            <h3 className="text-white text-sm font-medium mb-3">Recent Guesses</h3>
            <div className="space-y-2">
              {currentGame.guesses.slice(-3).map((guess, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Player {guess.userId.slice(-4)}</span>
                  <span className="text-orange-400 font-medium">{guess.guess}</span>
                </div>
              ))}
              {currentGame.guesses.length > 3 && (
                <div className="text-xs text-gray-500 text-center pt-1">
                  +{currentGame.guesses.length - 3} more guesses
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 px-6 py-3 rounded-lg border border-gray-600 text-white hover:bg-gray-800 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleJoinGame}
            className="flex-1 px-6 py-3 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors font-medium"
          >
            Join Game
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <ErrorMessage 
            message={error}
            onClose={clearError}
          />
        )}
      </div>
    </div>
  )
}
