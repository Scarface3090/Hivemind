import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGameById, submitGuess } from '../../api/games.js';
import type { GamePollingResponse, GuessResponse } from '../../../shared/api.js';
import { MAX_GUESS_VALUE, MIN_GUESS_VALUE } from '../../../shared/constants.js';
import { ApiError } from '../../api/client.js';
import { SpectrumSlider } from '../../components/SpectrumSlider.js';
import { SimpleConsensusCanvas } from '../../components/SimpleConsensusCanvas.js';
import { JudgesScale } from '../../components/JudgesScale.js';
import ParticleOverlay, { type ParticleOverlayHandle } from '../../components/ParticleOverlay.js';
import { useCountdown } from '../../hooks/useCountdown.js';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const GuessingView = (): JSX.Element => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const currentValueRef = useRef<number>(50);
  const particlesRef = useRef<ParticleOverlayHandle | null>(null);
  const [currentValue, setCurrentValue] = useState<number>(50);
  const [showJustification, setShowJustification] = useState<boolean>(true);
  const [isJustificationFocused, setIsJustificationFocused] = useState<boolean>(false);

  const { data, isLoading, error, isFetching } = useQuery<GamePollingResponse>({
    queryKey: ['game', gameId],
    queryFn: () => getGameById(gameId!),
    enabled: !!gameId,
    refetchInterval: 2000, // 2 seconds for near real-time updates (faster than default)
    refetchIntervalInBackground: true, // Continue polling even when tab is not active
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

  // Organic participant counter animation
  const [animatedParticipants, setAnimatedParticipants] = useState<number>(0);
  const participantsAnimRef = useRef<number | null>(null);
  const lastParticipantsRef = useRef<number>(0);
  
  // Enhanced consensus state (for future use)
  const [, setConsensusStrength] = useState<number>(0);
  const [, setIsHivemindActive] = useState<boolean>(false);

  // A11y: Debounced ARIA announcement for settled live median
  const [announcedMedian, setAnnouncedMedian] = useState<number | null>(null);
  const medianTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    const m = data?.median?.median;
    if (typeof m !== 'number') {
      setAnnouncedMedian(null);
      if (medianTimeoutRef.current) cancelAnimationFrame(medianTimeoutRef.current);
      return;
    }

    const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delayMs = reduced ? 200 : 900; // allow scene animation to settle before announcing
    const start = performance.now();

    const step = () => {
      const elapsed = performance.now() - start;
      if (elapsed >= delayMs) {
        setAnnouncedMedian(m);
        medianTimeoutRef.current = null;
        return;
      }
      medianTimeoutRef.current = requestAnimationFrame(step);
    };

    if (medianTimeoutRef.current) cancelAnimationFrame(medianTimeoutRef.current);
    medianTimeoutRef.current = requestAnimationFrame(step);

    return () => {
      if (medianTimeoutRef.current) cancelAnimationFrame(medianTimeoutRef.current);
      medianTimeoutRef.current = null;
    };
  }, [data?.median?.median]);

  useEffect(() => {
    const target = data?.game.totalParticipants ?? 0;
    const start = lastParticipantsRef.current;
    lastParticipantsRef.current = target;

    if (start === target) {
      setAnimatedParticipants(target);
      return;
    }

    // Calculate consensus strength and activity
    const median = data?.median?.median;
    if (median !== null && median !== undefined && target > 0) {
      // Simple consensus calculation - in production this would use actual distribution data
      const participantFactor = Math.min(1, target / 20);
      const medianStability = 0.7; // Would be calculated from median history
      setConsensusStrength(participantFactor * medianStability);
    } else {
      setConsensusStrength(0);
    }
    
    // Detect activity (new participants)
    if (target > start) {
      setIsHivemindActive(true);
      setTimeout(() => setIsHivemindActive(false), 3000); // Active state for 3 seconds
    }

    const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setAnimatedParticipants(target);
      return;
    }

    const duration = Math.min(500, Math.max(200, Math.abs(target - start) * 30));
    const startTs = performance.now();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = () => {
      const now = performance.now();
      const t = Math.min(1, (now - startTs) / duration);
      const eased = easeOutCubic(t);
      const value = Math.round(start + (target - start) * eased);
      setAnimatedParticipants(value);
      if (t < 1) {
        participantsAnimRef.current = requestAnimationFrame(step);
      } else {
        participantsAnimRef.current = null;
      }
    };

    if (participantsAnimRef.current) cancelAnimationFrame(participantsAnimRef.current);
    participantsAnimRef.current = requestAnimationFrame(step);

    return () => {
      if (participantsAnimRef.current) cancelAnimationFrame(participantsAnimRef.current);
      participantsAnimRef.current = null;
    };
  }, [data?.game.totalParticipants, data?.median?.median]);

  const mutation = useMutation<GuessResponse, unknown, { value: number; justification?: string }>({
    mutationFn: (payload) => {
      return submitGuess(gameId!, payload);
    },
    onMutate: () => {
      setSubmissionFeedback(null);
    },
    onSuccess: () => {
      // Fire a celebratory burst using overlay before navigating
      try {
        particlesRef.current?.burst({ preset: 'submit' });
      } catch (err) {
        console.warn('Failed to trigger particle burst:', err);
      }
      // After submitting a guess, refresh feeds and stop game polling, then navigate home
      void queryClient.invalidateQueries({ queryKey: ['activeGames'] });
      void queryClient.cancelQueries({ queryKey: ['game', gameId] });
      void queryClient.removeQueries({ queryKey: ['game', gameId] });
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
    const raw = new FormData(form).get('justification')?.toString();
    // Only include justification if toggle is on AND there's actual text
    const justification = showJustification && raw && raw.trim().length > 0 ? raw.trim() : undefined;
    
    mutation.mutate({ value: currentValue, ...(justification && { justification }) });
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
      <div className="container" style={{ position: 'relative' }}>

        
        <ParticleOverlay ref={particlesRef} effectType="brushStroke" performance="medium" />
        <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(1px, 1px, 1px, 1px)' }}>
          {typeof announcedMedian === 'number' ? `Hivemind verdict is ${announcedMedian}` : ''}
        </div>
        <header className="feed-item feed-item--inline">
          <div className="feed-item__top">
            <span
              className="chip chip--participants"
              role="status"
              aria-live="polite"
              title={`${game?.totalParticipants ?? 0} unique ${(game?.totalParticipants ?? 0) === 1 ? 'player has' : 'players have'} submitted guesses`}
            >
              👥 {Number.isFinite(animatedParticipants) ? animatedParticipants : (game?.totalParticipants ?? '—')}
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
            {/* Show Topic (Context) above the clue */}
            {game?.spectrum?.context && (
              <div style={{
                fontSize: '12px',
                color: '#888',
                textAlign: 'center',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Topic: {game.spectrum.context}
              </div>
            )}
            <h2 className="feed-item__title feed-item__title--center">{game?.clue ?? 'Loading game…'}</h2>
          </div>

        </header>

        {/* Real-time Speedometer - Prominent Position */}
        {game?.spectrum && (
          <JudgesScale
            median={data?.median?.median ?? null}
            totalParticipants={game.totalParticipants}
            leftLabel={game.spectrum.leftLabel}
            rightLabel={game.spectrum.rightLabel}
            className="speedometer-main"
          />
        )}

        {/* Hivemind Activity Visualization */}
        {game?.spectrum && (
          <div className="hivemind-visualization" style={{ marginBottom: '20px', position: 'relative' }}>
            <SimpleConsensusCanvas
              median={data?.median?.median ?? null}
              totalParticipants={game.totalParticipants}
              className="consensus-overlay"
            />
            
            {/* Real-time data indicator */}
            {isFetching && (
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  color: '#00ff88',
                  background: 'rgba(0,0,0,0.6)',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  zIndex: 10
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#00ff88',
                    animation: 'pulse 1s ease-in-out infinite'
                  }}
                />
                Live
              </div>
            )}
          </div>
        )}

        {/* Spectrum slider with live feedback */}
        {game?.spectrum && (
          <div className="spectrum-section">
            <SpectrumSlider
              spectrum={game.spectrum}
              value={currentValue}
              onValueChange={updateCurrentValue}
              median={data?.median?.median ?? null}
              className="enhanced-slider"
            />
            
            {/* Live feedback about user's guess vs hivemind */}
            {data?.median?.median !== null && data?.median?.median !== undefined && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                fontSize: '12px',
                textAlign: 'center'
              }}>
                {Math.abs(currentValue - data.median.median) <= 5 ? (
                  <span style={{ color: '#00ff88' }}>
                    🎯 You're aligned with the hivemind verdict! (within 5 points)
                  </span>
                ) : currentValue < data.median.median ? (
                  <span style={{ color: '#ffaa00' }}>
                    📉 You're {data.median.median - currentValue} points below the hivemind verdict
                  </span>
                ) : (
                  <span style={{ color: '#ffaa00' }}>
                    📈 You're {currentValue - data.median.median} points above the hivemind verdict
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <form className="guess-form" onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="toggle-group" style={{ marginBottom: 16 }}>
            <label
              className="toggle-label"
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
            >
              <input
                type="checkbox"
                checked={showJustification}
                onChange={(e) => setShowJustification(e.target.checked)}
                aria-label="Enable justification input"
                style={{
                  // Visually hide but keep accessible
                  position: 'absolute',
                  opacity: 0,
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                }}
              />
              <span
                aria-hidden
                style={{
                  position: 'relative',
                  width: 54,
                  height: 30,
                  borderRadius: 22,
                  background: showJustification
                    ? 'linear-gradient(135deg, rgba(255,215,0,0.9), rgba(255,165,0,0.8))'
                    : 'linear-gradient(135deg, rgba(80,80,80,0.6), rgba(50,50,50,0.6))',
                  boxShadow: showJustification
                    ? '0 0 0 2px rgba(255,200,0,0.25), inset 0 0 12px rgba(0,0,0,0.35)'
                    : 'inset 0 0 12px rgba(0,0,0,0.35)',
                  transition: 'background 220ms ease, box-shadow 220ms ease',
                }}
              >
                {/* Brush-stroke texture simulation with layered pseudo strokes */}
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 22,
                    background: showJustification
                      ? 'radial-gradient(120% 100% at 0% 100%, rgba(255,255,255,0.12) 0%, transparent 60%), radial-gradient(120% 100% at 100% 0%, rgba(255,255,255,0.08) 0%, transparent 60%)'
                      : 'radial-gradient(120% 100% at 0% 100%, rgba(255,255,255,0.06) 0%, transparent 60%), radial-gradient(120% 100% at 100% 0%, rgba(255,255,255,0.04) 0%, transparent 60%)',
                    pointerEvents: 'none',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: showJustification ? 28 : 3,
                    width: 24,
                    height: 24,
                    borderRadius: 16,
                    background: showJustification
                      ? 'conic-gradient(from 0deg, #fff 0 20%, #ffe08a 20% 60%, #fff 60% 100%)'
                      : 'conic-gradient(from 0deg, #eee 0 20%, #bbb 20% 60%, #eee 60% 100%)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.35), inset 0 0 6px rgba(0,0,0,0.25)',
                    transform: showJustification ? 'translateX(0)' : 'translateX(0)',
                    transition: 'left 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms ease',
                  }}
                />
              </span>
              <span style={{ color: '#fff', fontSize: '14px' }}>Influence the Hivemind</span>
            </label>
          </div>

          <div
            className="justification-group"
            style={{
              marginBottom: 16,
              display: showJustification ? 'block' : 'none',
              position: 'relative',
              borderRadius: 12,
              padding: 8,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
              boxShadow: isJustificationFocused
                ? 'inset 0 0 0 1px rgba(255,215,0,0.35), 0 8px 24px rgba(0,0,0,0.25)'
                : 'inset 0 0 0 1px rgba(255,215,0,0.15), 0 0 0 rgba(0,0,0,0)',
              transition: 'box-shadow 200ms ease',
            }}
          >
            <label htmlFor="justification" className="label">Influence the Hivemind</label>
            <textarea 
              id="justification" 
              name="justification" 
              rows={3} 
              className="input" 
              placeholder="Share your reasoning to influence the hivemind..." 
              maxLength={500}
              disabled={mutation.isPending}
              onFocus={() => setIsJustificationFocused(true)}
              onBlur={() => setIsJustificationFocused(false)}
              style={{
                borderRadius: 8,
                border: 'none',
                outline: 'none',
                width: '100%',
                padding: 12,
                background: 'rgba(0,0,0,0.35)',
                color: '#fff',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
              }}
            />
          </div>

          <div className="current-value" aria-live="polite">Your guess: {currentValue}</div>

          <div className="actions" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="secondary-button" onClick={() => navigate('/feed')}>Cancel</button>
            <button type="submit" disabled={isLoading || mutation.isPending} className="primary-button">
              {mutation.isPending ? 'Submitting…' : 'Submit guess'}
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


