import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGameById, submitGuess } from '../../api/games.js';
import type { GamePollingResponse, GuessResponse } from '../../../shared/api.js';
import { DEFAULT_MEDIAN_REFRESH_SECONDS, MAX_GUESS_VALUE, MIN_GUESS_VALUE } from '../../../shared/constants.js';
import { ApiError } from '../../api/client.js';
import { SpectrumSlider } from '../../components/SpectrumSlider.js';
import { useCountdown } from '../../hooks/useCountdown.js';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const GuessingView = (): JSX.Element => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const currentValueRef = useRef<number>(50);
  const latestMedianRef = useRef<number | null>(null);
  const [currentValue, setCurrentValue] = useState<number>(50);
  const [showJustification, setShowJustification] = useState<boolean>(false);

  const { data, isLoading, error, refetch } = useQuery<GamePollingResponse>({
    queryKey: ['game', gameId],
    queryFn: () => getGameById(gameId!),
    enabled: !!gameId,
    refetchInterval: DEFAULT_MEDIAN_REFRESH_SECONDS * 1000,
  });

  const [submissionFeedback, setSubmissionFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null
  );

  const fallbackEndTime = useMemo(() => new Date(Date.now() + 60_000).toISOString(), []);
  const game = data?.game;
  const endTime = game?.timing.endTime ?? fallbackEndTime;
  const { formatted: countdown, remainingMs } = useCountdown(endTime);
  const urgent = remainingMs <= 10_000;
  const queryClient = useQueryClient();

  const mutation = useMutation<GuessResponse, unknown, { value: number; justification?: string }>({
    mutationFn: (payload) => submitGuess(gameId!, payload),
    onMutate: () => {
      setSubmissionFeedback(null);
    },
    onSuccess: () => {
      // After submitting a guess, refresh feeds and stop game polling, then navigate home
      queryClient.invalidateQueries({ queryKey: ['activeGames'] });
      queryClient.cancelQueries({ queryKey: ['game', gameId] });
      queryClient.removeQueries({ queryKey: ['game', gameId] });
      navigate('/', { replace: true });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        const message = typeof err.payload === 'object' && err.payload && 'message' in err.payload
          ? String((err.payload as Record<string, unknown>).message ?? err.message)
          : err.message;
        setSubmissionFeedback({ kind: 'error', message: message || 'Unable to submit guess.' });
      } else {
        setSubmissionFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Unable to submit guess.' });
      }
    },
  });

  const updateCurrentValue = useCallback((value: number) => {
    const clamped = clamp(value, MIN_GUESS_VALUE, MAX_GUESS_VALUE);
    currentValueRef.current = clamped;
    setCurrentValue(clamped);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const raw = showJustification ? new FormData(form).get('justification')?.toString() : undefined;
    const justification = raw && raw.trim().length > 0 ? raw.trim() : undefined;
    mutation.mutate({ value: currentValue, justification });
  };

  useEffect(() => {
    currentValueRef.current = 50;
    setCurrentValue(50);
  }, [gameId]);

  useEffect(() => {
    if (data?.game.state === 'REVEAL') {
      navigate(`/results/${data.game.gameId}`, { replace: true });
    }
  }, [data?.game.state, data?.game.gameId, navigate]);


  if (error instanceof Error) {
    return (
      <section className="view view--guessing">
        <div className="container">
          <div className="alert-error">{error.message}</div>
          <button className="pill-button" onClick={() => navigate('/feed')}>Back to feed</button>
        </div>
      </section>
    );
  }

  return (
    <section className="view view--guessing">
      <div className="container">
        <header className="feed-item feed-item--inline">
          <div className="feed-item__top">
            <span
              className="chip chip--participants"
              role="status"
              aria-live="polite"
              title="Number of participants"
            >
              👥 {game?.totalParticipants ?? '—'}
            </span>
            <span
              className={`chip chip--timer ${urgent ? 'chip--urgent' : ''}`}
              role="status"
              aria-live="polite"
              title="Time remaining"
            >
              ⏱ {countdown}
            </span>
          </div>

          <div className="feed-item__meta">
            <p className="feed-item__host">Hosted by {game?.hostUsername ?? '—'}</p>
            <h2 className="feed-item__title feed-item__title--center">{game?.clue ?? 'Loading game…'}</h2>
          </div>

        </header>

        {game?.spectrum && (
          <SpectrumSlider
            spectrum={game.spectrum}
            value={currentValue}
            onValueChange={updateCurrentValue}
            median={data?.median?.median}
          />
        )}

        <form className="guess-form" onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="toggle-group" style={{ marginBottom: 16 }}>
            <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={showJustification} 
                onChange={(e) => setShowJustification(e.target.checked)}
                style={{ width: 20, height: 20 }}
                aria-label="Enable justification input"
              />
              <span style={{ color: '#fff', fontSize: '14px' }}>Add justification</span>
            </label>
          </div>

          {showJustification && (
            <div className="justification-group" style={{ marginBottom: 16 }}>
              <label htmlFor="justification" className="label">Justification</label>
              <textarea 
                id="justification" 
                name="justification" 
                rows={3} 
                className="input" 
                placeholder="Why did you choose this value?" 
              />
            </div>
          )}

          <div className="current-value" aria-live="polite">Your guess: {currentValue}</div>

          <div className="actions" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="secondary-button" onClick={() => navigate('/feed')}>Cancel</button>
            <button type="submit" disabled={isLoading || mutation.isLoading} className="primary-button">
              {mutation.isLoading ? 'Submitting…' : 'Submit guess'}
            </button>
          </div>

          {submissionFeedback && (
            <div
              className={submissionFeedback.kind === 'success' ? 'alert-success' : 'alert-error'}
              role="status"
              aria-live="polite"
              style={{ marginTop: 12 }}
            >
              {submissionFeedback.message}
            </div>
          )}
        </form>
      </div>
    </section>
  );
};

export default GuessingView;


