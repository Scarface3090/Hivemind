import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requestDraft, publishGame } from '../../api/games.js';
import type { DraftResponse, PublishGameResponse } from '../../../shared/api.js';
import { DEFAULT_GAME_DURATIONS_MINUTES } from '../../../shared/constants.js';

// No hardcoded host ID; server uses authenticated context

interface HostFormState {
  clue: string;
  durationMinutes: number | null;
  errors: {
    clue?: string;
    durationMinutes?: string;
  };
}

const initialFormState: HostFormState = {
  clue: '',
  durationMinutes: null,
  errors: {},
};

const HostView = (): JSX.Element => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formState, setFormState] = useState<HostFormState>(initialFormState);
  const [lastDraft, setLastDraft] = useState<DraftResponse | null>(null);
  const [optimisticGame, setOptimisticGame] = useState<PublishGameResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'drafting' | 'publishing' | 'success' | 'error'>(
    'idle'
  );
  const [statusMessage, setStatusMessage] = useState<string>('');

  const validateForm = useCallback((state: HostFormState) => {
    const errors: HostFormState['errors'] = {};
    if (!state.clue.trim()) {
      errors.clue = 'Add a short clue so players know what to guess.';
    }
    if (!state.durationMinutes) {
      errors.durationMinutes = 'Select how long the game should stay open.';
    }
    return errors;
  }, []);

  const resetForm = useCallback(() => {
    setFormState(initialFormState);
    setLastDraft(null);
  }, []);

  const draftMutation = useMutation({
    mutationKey: ['host', 'draft'],
    mutationFn: () => requestDraft(),
    onSuccess: (draft) => {
      setLastDraft(draft);
      setStatus('idle');
      setStatusMessage('Draft ready. Add a clue and publish.');
    },
  });

  const publishMutation = useMutation({
    mutationKey: ['host', 'publish'],
    mutationFn: (payload: { draftId: string; clue: string; durationMinutes: number }) => publishGame(payload),
    onSuccess: (game) => {
      setOptimisticGame(game);
      void queryClient.invalidateQueries({ queryKey: ['activeGames'] });
      navigate('/');
    },
  });

  const isLoading = draftMutation.isLoading || publishMutation.isLoading;

  // Fetch draft on mount
  useEffect(() => {
    if (!lastDraft && !draftMutation.isLoading && status === 'idle') {
      setStatus('drafting');
      setStatusMessage('Requesting a fresh spectrum...');
      draftMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClueChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormState((prev) => ({
      ...prev,
      clue: event.target.value,
      errors: {
        ...prev.errors,
        clue: undefined,
      },
    }));
  }, []);

  const handleDurationSelect = useCallback((duration: number) => {
    setFormState((prev) => ({
      ...prev,
      durationMinutes: duration,
      errors: {
        ...prev.errors,
        durationMinutes: undefined,
      },
    }));
  }, []);

  const submitHostForm = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isLoading) {
        return;
      }

      const errors = validateForm(formState);
      if (Object.keys(errors).length > 0) {
        setFormState((prev) => ({
          ...prev,
          errors,
        }));
        return;
      }

      try {
        if (!lastDraft) {
          setStatus('drafting');
          setStatusMessage('Preparing your spectrum...');
          const draft = await draftMutation.mutateAsync();
          setLastDraft(draft);
        }

        setStatus('publishing');
        setStatusMessage('Publishing your game to the feed...');
        await publishMutation.mutateAsync({
          draftId: (lastDraft ?? (await draftMutation.mutateAsync())).draftId,
          clue: formState.clue.trim(),
          durationMinutes: formState.durationMinutes!,
        });

        setStatus('success');
        setStatusMessage('Game published! Redirecting...');
        resetForm();
      } catch (error) {
        setStatus('error');
        setStatusMessage(error instanceof Error ? error.message : 'Failed to publish game. Try again.');
      }
    },
    [formState, isLoading, publishMutation, resetForm, draftMutation, validateForm, lastDraft]
  );

  const statusDotClass = useMemo(() => {
    switch (status) {
      case 'drafting':
      case 'publishing':
        return 'host-form__status-dot host-form__status-dot--loading';
      case 'success':
        return 'host-form__status-dot host-form__status-dot--success';
      case 'error':
        return 'host-form__status-dot host-form__status-dot--error';
      default:
        return 'host-form__status-dot';
    }
  }, [status]);

  const finalStatusMessage = useMemo(() => {
    if (status === 'idle') {
      return 'Share a clue and duration to publish a fresh game.';
    }
    return statusMessage;
  }, [status, statusMessage]);

  if (draftMutation.isLoading && !lastDraft) {
    return (
      <section className="host-layout">
        <header>
          <h2 className="text-2xl font-semibold">Host a game</h2>
          <p className="surface-muted">Generating your spectrum…</p>
        </header>
        <div className="surface-card">
          <div className="host-form__status" aria-live="polite">
            <span className="host-form__status-dot host-form__status-dot--loading" aria-hidden />
            <span>Preparing your spectrum…</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="host-layout">
      <header>
        <h2 className="text-2xl font-semibold">Host a game</h2>
        <p className="surface-muted">
          Draft a new spectrum, craft a compelling clue, and publish instantly with optimistic feedback.
        </p>
      </header>

      <div className="surface-card">
        <form className="host-form" onSubmit={submitHostForm} noValidate>
          {lastDraft && (
            <div className="host-form__section">
              <div className="host-form__section-header">
                <span className="host-form__label">Your spectrum</span>
                <p className="host-form__description">Players will guess along this spectrum.</p>
              </div>
              <div className="host-form__helper">
                <strong>{lastDraft.spectrum.leftLabel}</strong> ↔{' '}
                <strong>{lastDraft.spectrum.rightLabel}</strong>
              </div>
              <div className="host-form__section-header">
                <span className="host-form__label">Your secret target</span>
                <p className="host-form__description">
                  Your clue should guide players to this value on the spectrum.
                </p>
              </div>
              <div className="host-form__helper">
                Target: <strong>{lastDraft.secretTarget}</strong>
              </div>
            </div>
          )}
          <div className="host-form__section">
            <div className="host-form__section-header">
              <label className="host-form__label" htmlFor="host-clue">
                Clue for the hive
              </label>
              <p className="host-form__description">
                Give players a hint that nudges them toward the hidden target.
              </p>
            </div>
            <textarea
              id="host-clue"
              className={`host-form__input ${formState.errors.clue ? 'host-form__input--error' : ''}`}
              name="clue"
              placeholder="Example: The best sci-fi series for binge watching"
              value={formState.clue}
              onChange={handleClueChange}
              rows={3}
              maxLength={160}
              disabled={isLoading || !lastDraft}
            />
            {formState.errors.clue ? (
              <p className="host-form__error" role="alert">
                {formState.errors.clue}
              </p>
            ) : (
              <p className="host-form__helper">Keep it short and descriptive. 160 characters max.</p>
            )}
          </div>

          <div className="host-form__section">
            <div className="host-form__section-header">
              <span className="host-form__label">Game duration</span>
              <p className="host-form__description">
                Decide how long players have to submit their guesses.
              </p>
            </div>

            <div className="host-form__durations">
              {DEFAULT_GAME_DURATIONS_MINUTES.map((duration) => {
                const isSelected = formState.durationMinutes === duration;
                return (
                  <button
                    key={duration}
                    type="button"
                    className={`host-form__duration-button ${isSelected ? 'host-form__duration-button--selected' : ''}`}
                    onClick={() => handleDurationSelect(duration)}
                    disabled={isLoading}
                  >
                    {Math.round(duration / 60)} hour{duration === 60 ? '' : 's'}
                  </button>
                );
              })}
            </div>

            {formState.errors.durationMinutes && (
              <p className="host-form__error" role="alert">
                {formState.errors.durationMinutes}
              </p>
            )}
          </div>

          <div className="host-form__actions">
            <button type="submit" className="host-form__cta" disabled={isLoading || !lastDraft}>
              <span className="host-form__cta-icon" aria-hidden>
                🚀
              </span>
              {isLoading ? 'Publishing...' : 'Publish game'}
            </button>

            <div className="host-form__status" aria-live="polite">
              <span className={statusDotClass} aria-hidden />
              <span>{finalStatusMessage}</span>
            </div>

            {lastDraft && (
              <p className="host-form__helper">
                Draft locked in. Secret target is hidden from players until reveal.
              </p>
            )}

            {optimisticGame && (
              <p className="host-form__helper">
                Game <strong>{optimisticGame.gameId}</strong> is live. It may take a moment to appear in the feed while
                we refresh data.
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
};

export default HostView;
