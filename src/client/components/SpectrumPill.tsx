import type { Spectrum } from '../../shared/types/Spectrum.js';

interface SpectrumPillProps {
  spectrum: Spectrum;
  className?: string;
  variant?: 'inline' | 'full';
}

export const SpectrumPill = ({ spectrum, className, variant = 'inline' }: SpectrumPillProps): JSX.Element => {
  const { leftLabel, rightLabel } = spectrum;
  if (variant === 'full') {
    return (
      <div className={`spectrum spectrum--full ${className ?? ''}`.trim()} aria-label={`${leftLabel} to ${rightLabel}`}>
        <div className="spectrum__labels">
          <span className="truncate" title={leftLabel}>{leftLabel}</span>
          <span className="truncate" title={rightLabel}>{rightLabel}</span>
        </div>
        <div className="spectrum__bar" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`.trim()} aria-label={`${leftLabel} to ${rightLabel}`}>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <span className="truncate" title={leftLabel}>{leftLabel}</span>
        <span aria-hidden>—</span>
        <span className="truncate" title={rightLabel}>{rightLabel}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gradient-to-r from-amber-400/60 to-blue-600/60" />
    </div>
  );
};

export default SpectrumPill;


