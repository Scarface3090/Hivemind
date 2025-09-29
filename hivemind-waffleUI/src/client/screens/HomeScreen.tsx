
import { useNavigationStore, ROUTES } from '../../stores/navigationStore'
import { GAME_TITLE, ACCENT, TEXT_PRIMARY, TEXT_SECONDARY } from '../../constants'

export function HomeScreen() {
  const navigate = useNavigationStore((state) => state.navigate)

  return (
    <div className="min-h-screen bg-[#0b141c] flex items-center justify-center p-6">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-4xl font-extrabold mb-3" style={{ color: TEXT_PRIMARY }}>
          {GAME_TITLE}
        </h1>
        <p className="text-base mb-8" style={{ color: TEXT_SECONDARY }}>
          A social guessing game where one player challenges the community to read their mind.
        </p>

        <div className="space-y-6">
          {/* How to play */}
          <div className="text-left p-4 rounded-lg border border-white/10 bg-white/5">
            <h2 className="font-semibold mb-2" style={{ color: TEXT_PRIMARY }}>
              How to play
            </h2>
            <ul className="list-disc list-inside text-sm space-y-1" style={{ color: TEXT_SECONDARY }}>
              <li>Host provides a clue pointing to their secret target on a spectrum.</li>
              <li>Community guesses where the clue falls on the spectrum.</li>
              <li>Discuss, debate, and score points for accuracy and engagement.</li>
            </ul>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              className="flex-1 px-5 py-3 rounded-lg font-semibold hover:opacity-90 transition border text-center"
              style={{ borderColor: ACCENT, color: ACCENT }}
              onClick={() => navigate(ROUTES.DAILY)}
            >
              Join Game
            </button>
            <button
              className="flex-1 px-5 py-3 rounded-lg font-semibold hover:opacity-90 transition text-center"
              style={{ background: ACCENT, color: "#1a1a1a" }}
              onClick={() => navigate(ROUTES.HOST_SETUP)}
            >
              Host Game
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
