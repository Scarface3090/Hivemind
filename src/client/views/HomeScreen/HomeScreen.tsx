import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getActiveGames } from '../../api/games.js';
import { SpectrumPill } from '../../components/SpectrumPill.js';
import { useCountdown } from '../../hooks/useCountdown.js';
import type { GameMetadata } from '../../../shared/types/Game.js';

const HomeScreen = (): JSX.Element => {
  const {
    data: activeGamesResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['activeGames', { limit: 3 }],
    queryFn: () => getActiveGames({ limit: 3 }),
    refetchInterval: 1500,
    staleTime: 10_000,
  });

  return (
    <section className="home-layout">
      <div className="hero-card">
        <h2 className="hero-title">Host a game or join the hive mind.</h2>
        <p className="hero-body">
          Challenge your friends to align on the hidden target. Host new games, explore active matches, and see how
          closely the community guesses.
        </p>
        <div className="hero-actions">
          <Link to="/host" className="button-primary">
            Host Game
          </Link>
          <Link to="/feed" className="button-secondary">
            View Active Games
          </Link>
        </div>
      </div>

      <div className="surface-card">
        <header className="surface-header">
          <h3>Active games</h3>
          <Link to="/feed" className="text-sm font-medium text-reddit-orange">
            See all
          </Link>
        </header>
        {isLoading && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="skeleton-card">
                <div className="skeleton-line" style={{ width: '40%' }} />
                <div className="skeleton-line" />
                <div className="skeleton-line" style={{ width: '70%' }} />
              </div>
            ))}
          </div>
        )}
        {error && (
          <p className="surface-muted">
            Could not load active games. Please try again later.
          </p>
        )}
        {!isLoading && !error && (
          <>
            {activeGamesResponse?.games.length === 0 && (
              <p className="surface-muted">
                No live games at the moment. Host one to get the hive buzzing!
              </p>
            )}
            {activeGamesResponse && activeGamesResponse.games.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {activeGamesResponse.games.map((game) => (
                  <GamePreviewCard key={game.gameId} game={game} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

interface GamePreviewCardProps {
  game: GameMetadata;
}

const GamePreviewCard = ({ game }: GamePreviewCardProps): JSX.Element => {
  const { formatted, remainingMs } = useCountdown(game.timing.endTime);
  const urgent = remainingMs <= 10_000;
  return (
    <Link to={`/game/${game.gameId}`} className="preview-card-link">
      <article className="preview-card">
        <div className="preview-card__meta">
          <p className="preview-card__host">Hosted by {game.hostUsername}</p>
          <SpectrumPill spectrum={game.spectrum} className="mt-1" />
          <h4 className="preview-card__title">{game.clue}</h4>
        </div>
        <div className="preview-card__metrics flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full bg-zinc-900 text-zinc-200 px-2 py-1 text-xs"
            role="status"
            aria-live="polite"
            title="Number of participants"
          >
            👥 {game.totalParticipants}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-mono ${urgent ? 'bg-red-900 text-white' : 'bg-slate-900 text-slate-200'}`}
            role="status"
            aria-live="polite"
            title="Time remaining"
          >
            ⏱ {formatted}
          </span>
          <span className="pill-button text-xs">Join Game</span>
        </div>
      </article>
    </Link>
  );
};

export default HomeScreen;
