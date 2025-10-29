import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { SpectrumPill } from './SpectrumPill.js';
import { useDevTools } from '../hooks/useDevTools.js';
import { useCountdown } from '../hooks/useCountdown.js';
import type { GameMetadata } from '../../shared/types/Game.js';

export function ActiveGameCard({ game }: { game: GameMetadata }): JSX.Element {
  const { formatted, remainingMs } = useCountdown(game.timing.endTime);
  const urgent = remainingMs <= 10_000;
  const [count, setCount] = useState<number>(100);
  const [stdDev, setStdDev] = useState<number>(15);
  const [busy, setBusy] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const navigate = useNavigate();

  const { enabled, secretRequired, secret, setSecret, headers } = useDevTools();

  return (
    <article className="feed-item">
      {/* Header with host info and status indicators */}
      <div className="feed-item__header">
        <div className="feed-item__host-info">
          <p className="feed-item__host">Hosted by</p>
          <h4 className="feed-item__host-name">{game.hostUsername}</h4>
        </div>
        <div className="feed-item__status">
          <span
            className="chip chip--participants"
            role="status"
            aria-live="polite"
            title={`${game.totalParticipants} unique ${game.totalParticipants === 1 ? 'player has' : 'players have'} submitted guesses`}
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
      </div>

      {/* Main content area */}
      <div className="feed-item__content">
        <h3 className="feed-item__title">{game.clue}</h3>
        <SpectrumPill spectrum={game.spectrum} variant="full" className="feed-item__spectrum" />
      </div>

      {/* Action area */}
      <div className="feed-item__actions">
        {game.state === 'REVEAL' ? (
          <Link className="pill-button pill-button--primary" to={`/results/${game.gameId}`}>
            View Results
          </Link>
        ) : (
          <Link className="pill-button pill-button--primary" to={`/game/${game.gameId}`}>
            Join Game
          </Link>
        )}
      </div>

      {enabled && (
        <div className="feed-item__dev" style={{ marginTop: 8 }}>
          <div className="feed-item__dev-row" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {secretRequired && !secret && (
              <input
                type="password"
                placeholder="Dev secret"
                onChange={(e) => setSecret(e.target.value)}
                className="chip"
                style={{ padding: '4px 8px' }}
                aria-label="Dev tools secret"
              />
            )}
            <label className="sr-only" htmlFor={`dev-count-${game.gameId}`}>Count</label>
            <input
              id={`dev-count-${game.gameId}`}
              type="number"
              min={1}
              max={5000}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(5000, Number(e.target.value) || 0)))}
              className="chip"
              style={{ padding: '4px 8px' }}
            />
            <label className="sr-only" htmlFor={`dev-std-${game.gameId}`}>Std Dev</label>
            <input
              id={`dev-std-${game.gameId}`}
              type="number"
              min={1}
              max={50}
              value={stdDev}
              onChange={(e) => setStdDev(Math.max(1, Math.min(50, Number(e.target.value) || 0)))}
              className="chip"
              style={{ padding: '4px 8px' }}
            />

            <button
              type="button"
              className="pill-button"
              onClick={async () => {
                setBusy(true);
                setStatus('');
                try {
                  const res = await fetch(`/api/dev/games/${encodeURIComponent(game.gameId)}/simulate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
                    body: JSON.stringify({ count, stdDev }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error((data as { message?: string })?.message || 'Failed to simulate');
                  setStatus(`Simulated ${(data as { inserted?: number })?.inserted ?? count} guesses`);
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Simulation failed';
                  setStatus(message);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              title="Simulate guesses"
            >
              Simulate
            </button>
            <button
              type="button"
              className="pill-button"
              onClick={async () => {
                setBusy(true);
                setStatus('');
                try {
                  const res = await fetch(`/api/dev/games/${encodeURIComponent(game.gameId)}/force-reveal`, {
                    method: 'POST',
                    headers: { ...(headers || {}) },
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error((data as { message?: string })?.message || 'Failed to force reveal');
                  setStatus('Reveal triggered');
                  navigate(`/results/${game.gameId}`);
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Force reveal failed';
                  setStatus(message);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              title="Force reveal"
            >
              Force Reveal
            </button>

            {status && (
              <span className="chip" role="status" aria-live="polite">{status}</span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}


