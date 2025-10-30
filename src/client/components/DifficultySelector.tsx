import { SpectrumDifficulty } from '../../shared/enums.js';
import type { ContextSummary } from '../../shared/api.js';

interface DifficultySelectorProps {
  selectedDifficulty: SpectrumDifficulty | null;
  onDifficultySelect: (difficulty: SpectrumDifficulty) => void;
  contextData: ContextSummary | null;
  disabled?: boolean;
  onError?: (error: Error) => void;
  isLoading?: boolean;
}

interface DifficultyOption {
  level: SpectrumDifficulty;
  displayName: string;
  description: string;
  emoji: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    level: SpectrumDifficulty.Easy,
    displayName: 'Easy',
    description: 'Clear, straightforward choices',
    emoji: '🟢',
  },
  {
    level: SpectrumDifficulty.Medium,
    displayName: 'Medium',
    description: 'Moderate complexity',
    emoji: '🟡',
  },
  {
    level: SpectrumDifficulty.Hard,
    displayName: 'Hard',
    description: 'Challenging, nuanced decisions',
    emoji: '🔴',
  },
];

export const DifficultySelector = ({
  selectedDifficulty,
  onDifficultySelect,
  contextData,
  disabled = false,
  onError,
  isLoading = false,
}: DifficultySelectorProps): JSX.Element => {
  const getAvailableCount = (difficulty: SpectrumDifficulty): number => {
    if (!contextData?.difficultyBreakdown) return 0;
    return contextData.difficultyBreakdown[difficulty] || 0;
  };

  if (isLoading) {
    return (
      <div className="difficulty-selector">
        <div className="difficulty-selector__header">
          <span className="host-form__label">Choose difficulty level</span>
          <p className="host-form__description">
            Select how challenging you want the spectrum to be for players.
          </p>
        </div>
        <div className="difficulty-selector__options">
          {DIFFICULTY_OPTIONS.map((option) => (
            <div
              key={option.level}
              className="difficulty-option difficulty-option--loading"
              aria-hidden="true"
            >
              <div className="difficulty-option__content">
                <div className="difficulty-option__header">
                  <span className="difficulty-option__emoji">{option.emoji}</span>
                  <div className="difficulty-option__name difficulty-option__name--skeleton"></div>
                </div>
                <div className="difficulty-option__description difficulty-option__description--skeleton"></div>
                <div className="difficulty-option__count difficulty-option__count--skeleton"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="difficulty-selector">
      <div className="difficulty-selector__header">
        <span className="host-form__label">Choose difficulty level</span>
        <p className="host-form__description">
          Select how challenging you want the spectrum to be for players.
        </p>
      </div>

      <div className="difficulty-selector__options">
        {DIFFICULTY_OPTIONS.map((option) => {
          const availableCount = getAvailableCount(option.level);
          const isSelected = selectedDifficulty === option.level;
          const isDisabled = disabled || availableCount === 0;

          return (
            <button
              key={option.level}
              type="button"
              className={`difficulty-option ${
                isSelected ? 'difficulty-option--selected' : ''
              } ${isDisabled ? 'difficulty-option--disabled' : ''} transition-colors transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md rounded-2xl border-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400 brush-stroke`}
              onClick={() => {
                // Optimistic UI update
                onDifficultySelect(option.level);
              }}
              disabled={isDisabled}
              aria-pressed={isSelected}
              title={
                availableCount === 0
                  ? `No ${option.displayName.toLowerCase()} spectra available for this context`
                  : `${availableCount} ${option.displayName.toLowerCase()} spectrum${
                      availableCount === 1 ? '' : 's'
                    } available`
              }
            >
              <div className="difficulty-option__content">
                <div className="difficulty-option__header">
                  <span className="difficulty-option__emoji" aria-hidden="true">
                    {option.emoji}
                  </span>
                  <h3 className="difficulty-option__name">{option.displayName}</h3>
                </div>
                <p className="difficulty-option__description">{option.description}</p>
                <div className="difficulty-option__count">
                  {availableCount > 0 ? (
                    <span className="difficulty-option__count-text">
                      {availableCount} available
                    </span>
                  ) : (
                    <span className="difficulty-option__count-text difficulty-option__count-text--none">
                      None available
                    </span>
                  )}
                </div>
              </div>
              <div className="difficulty-option__indicator" aria-hidden="true">
                {isSelected ? '✓' : ''}
              </div>
            </button>
          );
        })}
      </div>

      {contextData && Object.values(contextData?.difficultyBreakdown ?? {}).every(count => count === 0) && (
        <div className="difficulty-selector__empty">
          <p className="host-form__error">
            No spectra available for the selected context. Please choose a different context.
          </p>
        </div>
      )}
    </div>
  );
};

export default DifficultySelector;
