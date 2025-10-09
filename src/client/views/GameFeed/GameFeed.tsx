import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getActiveGames } from '../../api/games.js';
import { SpectrumPill } from '../../components/SpectrumPill.js';
import { useCountdown } from '../../hooks/useCountdown.js';
import type { GameMetadata } from '../../../shared/types/Game.js';

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
          <FeedItemCard key={game.gameId} game={game} />
        ))}
      </div>
    </section>
  );
};

export default GameFeed;

function FeedItemCard({ game }: { game: GameMetadata }): JSX.Element {
  const { formatted, remainingMs } = useCountdown(game.timing.endTime);
  const urgent = remainingMs <= 10_000;
  return (
    <article className="feed-item">
      <div className="feed-item__meta">
        <p className="feed-item__host">Hosted by {game.hostUsername}</p>
        <SpectrumPill spectrum={game.spectrum} className="mt-1" />
        <h3 className="feed-item__title">{game.clue}</h3>
      </div>

      <div className="feed-item__footer flex items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-2">
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
        </div>
        <div className="feed-item__actions">
          <Link className="pill-button" to={`/game/${game.gameId}`}>Join game</Link>
        </div>
      </div>
    </article>
  );
}
