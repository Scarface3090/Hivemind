import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getActiveGames } from '../../api/games.js';
import type { GameMetadata } from '../../../shared/types/Game.js';
import { ActiveGameCard } from '../../components/ActiveGameCard.js';

const GameFeed = (): JSX.Element => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['activeGames'],
    queryFn: () => getActiveGames(),
    refetchInterval: 1500,
    staleTime: 10_000,
  });

  return (
    <section className="feed-layout">
      <header>
        <h2 className="text-2xl font-semibold">Active games</h2>
        <p className="surface-muted">Join an active match to test your intuition against the hive.</p>
      </header>

      <div className="feed-list">
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

        {error instanceof Error && <div className="alert-error">Couldn&rsquo;t load the feed. Try refreshing shortly.</div>}

        {data && data.games.length === 0 && !isLoading && (
          <div className="empty-state">No live games at the moment. Host one to get the hive buzzing!</div>
        )}

        {data?.games.map((game) => (
          <ActiveGameCard key={game.gameId} game={game} />
        ))}
      </div>
    </section>
  );
};

export default GameFeed;
