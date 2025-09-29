import { useState, useEffect } from 'react'
import { useNavigationStore, ROUTES } from '../stores/navigationStore'
import { useGameStore } from '../stores/gameStore'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { SpectrumDisplay } from '../components/SpectrumDisplay'
import { GuessSlider } from '../components/GuessSlider'

export function GameScreen() {
  const navigate = useNavigationStore((state) => state.navigate)
  const { currentGame, myGuess, isLoading, error, userId, submitGuess, clearError, reset } = useGameStore()
  const [guessValue, setGuessValue] = useState(50)
  const [justification, setJustification] = useState('')

  // Reset form when game changes
  useEffect(() => {
    if (myGuess) {
      setGuessValue(myGuess.value)
      setJustification(myGuess.justification)
    } else {
      setGuessValue(50)
      setJustification('')
    }
  }, [myGuess])

  const handleSubmitGuess = async () => {
    if (!currentGame) return

    // Calls Devvit server: POST /api/games/:gameId/guesses
    await submitGuess({
      value: guessValue,
      justification: justification.trim()
    })
  }

  const handleBack = () => {
    const confirmed = window.confirm('Are you sure you want to leave this game?')
    if (confirmed) {
      reset()
      navigate(ROUTES.HOME)
    }
  }

  // Loading state
  if (isLoading && !currentGame) {
    return (
      <div className="min-h-screen bg-[#0b141c] flex items-center justify-center">
        <LoadingSpinner message="Loading game..." />
      </div>
    )
  }

  // No game state
  if (!currentGame) {
    return (
      <div className="min-h-screen bg-[#0b141c] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-gray-400">No active game found.</p>
          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="px-6 py-3 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  const isHost = currentGame.hostUserId === userId
  const hasSubmittedGuess = !!myGuess

  return (
    <div className="min-h-screen bg-[#0b141c] overflow-auto">
      {/* Top Bar */}
      <div className="sticky top-0 left-0 right-0 p-4 flex items-center justify-between backdrop-blur bg-[#0b141c]/70 z-10 border-b border-gray-800">
        <div className="text-lg font-semibold text-white">
          {isHost ? 'Your Game' : 'Playing Game'}
        </div>
        <button
          onClick={handleBack}
          className="text-sm px-3 py-2 rounded-md border border-white/10 hover:bg-white/10 transition text-white"
        >
          Home
        </button>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 pb-8 space-y-6">
        {/* Game Info */}
        <div className="space-y-4">
          {/* Clue */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Clue</h3>
            <p className="text-white text-lg font-medium">{currentGame.clue}</p>
          </div>

          {/* Spectrum */}
          <SpectrumDisplay spectrum={currentGame.spectrum} />
        </div>

        {/* Host View */}
        {isHost && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-orange-300 text-sm mb-2">You're hosting this game</p>
              <p className="text-gray-300 text-xs">
                Players are guessing where your clue falls on the spectrum
              </p>
            </div>

            {/* Show all guesses */}
            <div className="space-y-2">
              <h3 className="text-white font-medium">Player Guesses ({currentGame.guesses.length})</h3>
              {currentGame.guesses.length === 0 ? (
                <p className="text-gray-400 text-sm">No guesses yet...</p>
              ) : (
                <div className="space-y-2">
                  {currentGame.guesses.map((guess, index) => (
                    <div key={index} className="bg-gray-800/50 rounded p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-white text-sm font-medium">Player {guess.userId.slice(-4)}</span>
                        <span className="text-orange-400 font-medium">{guess.guess}</span>
                      </div>
                      {guess.justification && (
                        <p className="text-gray-400 text-xs">{guess.justification}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Player View */}
        {!isHost && (
          <div className="space-y-6">
            {hasSubmittedGuess ? (
              // Show submitted guess
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-300 text-sm mb-2">Guess submitted!</p>
                <p className="text-white">Your guess: <span className="font-medium">{myGuess.value}</span></p>
                {myGuess.justification && (
                  <p className="text-gray-300 text-xs mt-2">"{myGuess.justification}"</p>
                )}
              </div>
            ) : (
              // Guess input form
              <div className="space-y-6">
                {/* Guess Slider */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <GuessSlider
                    value={guessValue}
                    onChange={setGuessValue}
                    spectrum={currentGame.spectrum}
                    disabled={isLoading}
                  />
                </div>

                {/* Justification */}
                <div className="space-y-2">
                  <label className="block text-white text-sm font-medium">
                    Why did you choose this position? (optional)
                  </label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value.slice(0, 280))}
                    placeholder="Explain your reasoning..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-800 text-white resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                    maxLength={280}
                    disabled={isLoading}
                  />
                  <div className="text-xs text-gray-400 text-right">
                    {justification.length}/280 characters
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmitGuess}
                  disabled={isLoading}
                  className="w-full px-6 py-3 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLoading ? 'Submitting...' : 'Submit Guess'}
                </button>
              </div>
            )}

            {/* Community Guesses */}
            <div className="space-y-2">
              <h3 className="text-white font-medium">Community Guesses ({currentGame.guesses.length})</h3>
              {currentGame.guesses.length === 0 ? (
                <p className="text-gray-400 text-sm">Be the first to guess!</p>
              ) : (
                <div className="text-gray-400 text-sm">
                  {currentGame.guesses.length} player{currentGame.guesses.length !== 1 ? 's' : ''} have guessed
                </div>
              )}
            </div>
          </div>
        )}

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