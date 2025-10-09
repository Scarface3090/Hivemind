import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getActiveGames } from '../../api/games.js';
import type { GameMetadata } from '../../../shared/types/Game.js';
import { ActiveGameCard } from '../../components/ActiveGameCard.js';

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
          <div className="feed-list">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="skeleton-card">
                <div className="skeleton-line" style={{ width: '30%' }} />
                <div className="skeleton-line" />
                <div className="skeleton-line" style={{ width: '60%' }} />
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
              <div className="feed-list">
                {activeGamesResponse.games.map((game) => (
                  <ActiveGameCard key={game.gameId} game={game} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default HomeScreen;
