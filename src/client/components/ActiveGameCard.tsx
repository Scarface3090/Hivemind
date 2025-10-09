import { Link } from 'react-router-dom';
import { SpectrumPill } from './SpectrumPill.js';
import { useCountdown } from '../hooks/useCountdown.js';
import type { GameMetadata } from '../../shared/types/Game.js';

export function ActiveGameCard({ game }: { game: GameMetadata }): JSX.Element {
  const { formatted, remainingMs } = useCountdown(game.timing.endTime);
  const urgent = remainingMs <= 10_000;
  return (
    <article className="feed-item">
      <div className="feed-item__top">
        <span
          className="chip chip--participants"
          role="status"
          aria-live="polite"
          title="Number of participants"
        >
          👥 {game.totalParticipants}
        </span>
        <span
          className={`chip chip--timer ${urgent ? 'chip--urgent' : ''}`}
          role="status"
          aria-live="polite"
          title="Time remaining"
        >
          ⏱ {formatted}
        </span>
      </div>

      <div className="feed-item__meta">
        <p className="feed-item__host">Hosted by {game.hostUsername}</p>
        <h3 className="feed-item__title feed-item__title--center">{game.clue}</h3>
      </div>

      <SpectrumPill spectrum={game.spectrum} variant="full" className="feed-item__spectrum" />

      <div className="feed-item__cta">
        <Link className="pill-button" to={`/game/${game.gameId}`}>Join game</Link>
      </div>
    </article>
  );
}


