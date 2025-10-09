import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import Phaser from 'phaser';
import { createPhaserGame } from '../../game/index.js';
import { getGameById, submitGuess } from '../../api/games.js';
import type { GamePollingResponse, GuessResponse } from '../../../shared/api.js';
import { DEFAULT_MEDIAN_REFRESH_SECONDS, MAX_GUESS_VALUE, MIN_GUESS_VALUE } from '../../../shared/constants.js';
import { ApiError } from '../../api/client.js';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const GuessingView = (): JSX.Element => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
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

  const mutation = useMutation<GuessResponse, unknown, { value: number; justification: string }>({
    mutationFn: (payload) => submitGuess(gameId!, payload),
    onMutate: () => {
      setSubmissionFeedback(null);
    },
    onSuccess: () => {
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
    const justification = showJustification ? (new FormData(form).get('justification')?.toString() ?? '') : undefined;
    mutation.mutate(
      { value: currentValue, justification },
      {
        onSuccess: () => {
          form.reset();
        },
      }
    );
  };

  useEffect(() => {
    currentValueRef.current = 50;
    setCurrentValue(50);
  }, [gameId]);

  useEffect(() => {
    const mountTarget = canvasRef.current;
    if (!mountTarget) return;

    const game = createPhaserGame({ parent: mountTarget });
    gameRef.current = game;

    const startScene = () => {
      if (!game.scene.isActive('GuessingScene')) {
        game.scene.start('GuessingScene', {
          initialValue: currentValueRef.current,
          median: latestMedianRef.current,
        });
      }
    };

    game.events.once(Phaser.Core.Events.BOOT, startScene);

    let cleanup: (() => void) | null = null;

    const wireSceneEvents = () => {
      if (!gameRef.current) return;
      try {
        const scene: any = gameRef.current.scene.getScene('GuessingScene');
        if (scene?.events) {
          const handler = (value: number) => {
            updateCurrentValue(value);
          };
          scene.events.on('slider:valueChanged', handler);
          if (typeof scene.setMedian === 'function') {
            scene.setMedian(latestMedianRef.current);
          }
          cleanup = () => {
            scene.events?.off?.('slider:valueChanged', handler);
          };
        }
      } catch {
        // Scene may not yet exist; try again after the next frame
        game.events.once(Phaser.Core.Events.POST_STEP, wireSceneEvents);
      }
    };

    game.events.once(Phaser.Core.Events.POST_STEP, wireSceneEvents);
    game.events.once(Phaser.Core.Events.RUNNER_STEP, wireSceneEvents);

    return () => {
      try {
        cleanup?.();
      } finally {
        // Destroy the Phaser game and remove the canvas element entirely
        game.destroy(true);

        if (mountTarget.contains(game.canvas)) {
          mountTarget.removeChild(game.canvas);
        }

        gameRef.current = null;
      }
    };
  }, [gameId, updateCurrentValue]);

  // Keep median in sync in scene
  useEffect(() => {
    const game = gameRef.current;
    const medianValue = data?.median?.median;
    latestMedianRef.current = typeof medianValue === 'number' ? medianValue : null;
    if (!game) return;

    const applyMedian = () => {
      try {
        const scene = game.scene.getScene('GuessingScene') as any;
        if (scene?.setMedian) scene.setMedian(latestMedianRef.current);
      } catch {
        game.events.once(Phaser.Core.Events.POST_STEP, applyMedian);
      }
    };

    applyMedian();
  }, [data?.median?.median]);

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
        <header className="view-header">
          <h2 className="text-xl font-semibold">{data?.game.clue ?? 'Loading game…'}</h2>
          <div className="surface-muted">Participants: {data?.game.totalParticipants ?? '—'}</div>
        </header>

        <div className="phaser-canvas" ref={canvasRef} style={{ width: '100%', aspectRatio: '16 / 9', background: '#111' }} />

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


