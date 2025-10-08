import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getActiveGames } from '../../api/games.js';

const GameFeed = (): JSX.Element => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['activeGames'],
    queryFn: () => getActiveGames(),
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
          <article key={game.gameId} className="feed-item">
            <div className="feed-item__meta">
              <p className="feed-item__host">Hosted by {game.hostUsername}</p>
              <h3 className="feed-item__title">{game.clue}</h3>
              <div className="feed-item__metrics">
                <span>Participants: {game.totalParticipants}</span>
                <span>State: {game.state}</span>
              </div>
            </div>

            <div className="feed-item__footer">
              <div className="feed-item__median">
                <span className="feed-item__median-label">Median</span>
                <span className="feed-item__median-value">{game.medianGuess ?? '—'}</span>
              </div>
              <div className="feed-item__actions">
                <Link className="pill-button" to={`/game/${game.gameId}`}>Join game</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default GameFeed;
