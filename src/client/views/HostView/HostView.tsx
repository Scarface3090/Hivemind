import { FormEvent, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requestDraft, requestFilteredDraft, publishGame, getContexts } from '../../api/games.js';
import type { DraftResponse, PublishGameResponse, ContextSummary } from '../../../shared/api.js';
import { DEFAULT_GAME_DURATIONS_MINUTES } from '../../../shared/constants.js';
import { SpectrumDifficulty } from '../../../shared/enums.js';
import { ContextSelector } from '../../components/ContextSelector.js';
import { DifficultySelector } from '../../components/DifficultySelector.js';
import { ContextSelectionErrorBoundary } from '../../components/ContextSelectionErrorBoundary.js';
import { LoadingSpinner } from '../../components/LoadingSpinner.js';

// No hardcoded host ID; server uses authenticated context

interface HostFormState {
  clue: string;
  durationMinutes: number | null;
  selectedContext: string | null;
  selectedDifficulty: SpectrumDifficulty | null;
  errors: {
    clue?: string;
    durationMinutes?: string;
    context?: string;
    difficulty?: string;
  };
}

const initialFormState: HostFormState = {
  clue: '',
  durationMinutes: null,
  selectedContext: null,
  selectedDifficulty: null,
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
  const [currentStep, setCurrentStep] = useState<'context' | 'difficulty' | 'clue'>('context');
  const [selectedContextData, setSelectedContextData] = useState<ContextSummary | null>(null);

  // Fetch available contexts
  const { data: contextsData } = useQuery({
    queryKey: ['contexts'],
    queryFn: getContexts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const validateForm = useCallback((state: HostFormState) => {
    const errors: HostFormState['errors'] = {};
    if (!state.selectedContext) {
      errors.context = 'Please select a context for your game.';
    }
    if (!state.selectedDifficulty) {
      errors.difficulty = 'Please select a difficulty level.';
    }
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
    setCurrentStep('context');
    setSelectedContextData(null);
  }, []);

  const draftMutation = useMutation({
    mutationKey: ['host', 'draft'],
    mutationFn: (params?: { context?: string; difficulty?: string }) => {
      if (params?.context && params?.difficulty) {
        return requestFilteredDraft({
          context: params.context,
          difficulty: params.difficulty,
        });
      }
      return requestDraft();
    },
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

  const isLoading = draftMutation.isPending || publishMutation.isPending;

  // Handle context selection
  const handleContextSelect = useCallback((context: string) => {
    const contextData = contextsData?.contexts.find(c => c.context === context) || null;
    setFormState((prev) => {
      const newErrors = { ...prev.errors };
      delete newErrors.context;
      delete newErrors.difficulty;
      return {
        ...prev,
        selectedContext: context,
        selectedDifficulty: null, // Reset difficulty when context changes
        errors: newErrors,
      };
    });
    setSelectedContextData(contextData);
    setCurrentStep('difficulty');
    setLastDraft(null); // Clear any existing draft
  }, [contextsData]);

  // Handle context selection errors
  const handleContextError = useCallback((error: Error) => {
    setFormState((prev) => ({
      ...prev,
      errors: {
        ...prev.errors,
        context: error.message,
      },
    }));
  }, []);

  // Handle difficulty selection errors
  const handleDifficultyError = useCallback((error: Error) => {
    setFormState((prev) => ({
      ...prev,
      errors: {
        ...prev.errors,
        difficulty: error.message,
      },
    }));
  }, []);

  // Handle difficulty selection
  const handleDifficultySelect = useCallback((difficulty: SpectrumDifficulty) => {
    setFormState((prev) => {
      const newErrors = { ...prev.errors };
      delete newErrors.difficulty;
      return {
        ...prev,
        selectedDifficulty: difficulty,
        errors: newErrors,
      };
    });
    setCurrentStep('clue');
    
    // Automatically fetch draft when both context and difficulty are selected
    // Pass context and difficulty directly to avoid stale formState
    setStatus('drafting');
    setStatusMessage('Generating your spectrum...');
    draftMutation.mutate({ 
      ...(formState.selectedContext && { context: formState.selectedContext }),
      difficulty 
    });
  }, [formState.selectedContext, draftMutation]);

  // Navigation handlers
  const goBackToContext = useCallback(() => {
    setCurrentStep('context');
    setFormState((prev) => ({
      ...prev,
      selectedContext: null,
      selectedDifficulty: null,
    }));
    setSelectedContextData(null);
    setLastDraft(null);
  }, []);

  const goBackToDifficulty = useCallback(() => {
    setCurrentStep('difficulty');
    setFormState((prev) => ({
      ...prev,
      selectedDifficulty: null,
    }));
    setLastDraft(null);
  }, []);

  const handleClueChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormState((prev) => {
      const newErrors = { ...prev.errors };
      delete newErrors.clue;
      return {
        ...prev,
        clue: event.target.value,
        errors: newErrors,
      };
    });
  }, []);

  const handleDurationSelect = useCallback((duration: number) => {
    setFormState((prev) => {
      const newErrors = { ...prev.errors };
      delete newErrors.durationMinutes;
      return {
        ...prev,
        durationMinutes: duration,
        errors: newErrors,
      };
    });
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
          const draft = await draftMutation.mutateAsync({
            ...(formState.selectedContext && { context: formState.selectedContext }),
            ...(formState.selectedDifficulty && { difficulty: formState.selectedDifficulty })
          });
          setLastDraft(draft);
        }

        setStatus('publishing');
        setStatusMessage('Publishing your game to the feed...');
        await publishMutation.mutateAsync({
          draftId: (lastDraft ?? (await draftMutation.mutateAsync({
            ...(formState.selectedContext && { context: formState.selectedContext }),
            ...(formState.selectedDifficulty && { difficulty: formState.selectedDifficulty })
          }))).draftId,
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

  // Show loading state when drafting
  if (draftMutation.isPending && !lastDraft) {
    return (
      <section className="host-layout">
        <header>
          <h2 className="text-2xl font-semibold">Host a game</h2>
          <p className="surface-muted">Generating your spectrum…</p>
        </header>
        <div className="surface-card">
          <div className="host-form__status" aria-live="polite">
            <LoadingSpinner message="Preparing your spectrum…" />
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
          Choose your content, craft a compelling clue, and publish instantly.
        </p>
      </header>

      <div className="surface-card">
        <form className="host-form" onSubmit={submitHostForm} noValidate>
          {/* Step 1: Context Selection */}
          {currentStep === 'context' && (
            <div className="host-form__section">
              <ContextSelectionErrorBoundary>
                <ContextSelector
                  selectedContext={formState.selectedContext}
                  onContextSelect={handleContextSelect}
                  disabled={isLoading}
                  onError={handleContextError}
                />
              </ContextSelectionErrorBoundary>
              {formState.errors.context && (
                <p className="host-form__error" role="alert">
                  {formState.errors.context}
                </p>
              )}
            </div>
          )}

          {/* Step 2: Difficulty Selection */}
          {currentStep === 'difficulty' && (
            <div className="host-form__section">
              <div className="host-form__breadcrumb">
                <button
                  type="button"
                  className="host-form__back-button"
                  onClick={goBackToContext}
                >
                  ← Back to contexts
                </button>
                <span className="host-form__breadcrumb-text">
                  Selected: <strong>{formState.selectedContext}</strong>
                </span>
              </div>
              
              <ContextSelectionErrorBoundary>
                <DifficultySelector
                  selectedDifficulty={formState.selectedDifficulty}
                  onDifficultySelect={handleDifficultySelect}
                  contextData={selectedContextData}
                  disabled={isLoading}
                  onError={handleDifficultyError}
                  isLoading={!selectedContextData && formState.selectedContext !== null}
                />
              </ContextSelectionErrorBoundary>
              {formState.errors.difficulty && (
                <p className="host-form__error" role="alert">
                  {formState.errors.difficulty}
                </p>
              )}
            </div>
          )}

          {/* Step 3: Clue and Duration */}
          {currentStep === 'clue' && (
            <>
              <div className="host-form__breadcrumb">
                <button
                  type="button"
                  className="host-form__back-button"
                  onClick={goBackToDifficulty}
                >
                  ← Back to difficulty
                </button>
                <span className="host-form__breadcrumb-text">
                  <strong>{formState.selectedContext}</strong> • <strong>{formState.selectedDifficulty}</strong>
                </span>
              </div>

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
            </>
          )}
        </form>
      </div>
    </section>
  );
};

export default HostView;
