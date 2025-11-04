import React from 'react';

interface BrushStrokeToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  ariaLabel?: string;
}

export const BrushStrokeToggle: React.FC<BrushStrokeToggleProps> = ({
  checked,
  onChange,
  label,
  ariaLabel
}) => {
  return (
    <div className="toggle-group" style={{ marginBottom: 16 }}>
      <label
        className="toggle-label"
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={ariaLabel || label}
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
            background: checked
              ? 'linear-gradient(135deg, rgba(255,215,0,0.9), rgba(255,165,0,0.8))'
              : 'linear-gradient(135deg, rgba(80,80,80,0.6), rgba(50,50,50,0.6))',
            boxShadow: checked
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
              background: checked
                ? 'radial-gradient(120% 100% at 0% 100%, rgba(255,255,255,0.12) 0%, transparent 60%), radial-gradient(120% 100% at 100% 0%, rgba(255,255,255,0.08) 0%, transparent 60%)'
                : 'radial-gradient(120% 100% at 0% 100%, rgba(255,255,255,0.06) 0%, transparent 60%), radial-gradient(120% 100% at 100% 0%, rgba(255,255,255,0.04) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <span
            style={{
              position: 'absolute',
              top: 3,
              left: checked ? 28 : 3,
              width: 24,
              height: 24,
              borderRadius: 16,
              background: checked
                ? 'conic-gradient(from 0deg, #fff 0 20%, #ffe08a 20% 60%, #fff 60% 100%)'
                : 'conic-gradient(from 0deg, #eee 0 20%, #bbb 20% 60%, #eee 60% 100%)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.35), inset 0 0 6px rgba(0,0,0,0.25)',
              transform: checked ? 'translateX(0)' : 'translateX(0)',
              transition: 'left 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms ease',
            }}
          />
        </span>
        <span style={{ color: '#fff', fontSize: '14px' }}>{label}</span>
      </label>
    </div>
  );
};

export default BrushStrokeToggle;