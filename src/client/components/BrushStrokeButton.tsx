import React, { useState, useRef, useCallback, useEffect } from 'react';
import { colors, components } from '../../shared/design-tokens.js';
import { ParticleOverlay } from './ParticleOverlay.js';

interface BrushStrokeButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'join' | 'host' | 'submit';
  disabled?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const BrushStrokeButton: React.FC<BrushStrokeButtonProps> = ({
  children,
  onClick,
  variant = 'submit',
  disabled = false,
  className = '',
  size = 'medium',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const burstTimeoutRef = useRef<number | null>(null);

  const buttonConfig = components.buttons[variant] as any; // Type assertion for design system access

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (burstTimeoutRef.current !== null) {
        clearTimeout(burstTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(() => {
    if (disabled || !onClick) return;

    // Reset state first to avoid a stuck burst when rapidly clicking
    setShowBurst(false);

    // Clear any existing timeout after resetting state
    if (burstTimeoutRef.current !== null) {
      clearTimeout(burstTimeoutRef.current);
      burstTimeoutRef.current = null;
    }

    // Trigger burst effect
    setShowBurst(true);
    burstTimeoutRef.current = window.setTimeout(() => {
      setShowBurst(false);
      burstTimeoutRef.current = null;
    }, 600);

    onClick();
  }, [disabled, onClick]);

  const handleMouseEnter = useCallback(() => {
    if (!disabled) {
      setIsHovered(true);
    }
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
  }, []);

  const handleMouseDown = useCallback(() => {
    if (!disabled) {
      setIsPressed(true);
    }
  }, [disabled]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
        if (e.key === ' ') e.preventDefault();
        setIsPressed(true);
      }
    },
    [disabled]
  );

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      setIsPressed(false);
    }
  }, []);

  const getButtonStyles = () => {
    const baseStyles = {
      position: 'relative' as const,
      background: buttonConfig?.background || colors.interactive.join,
      color: buttonConfig?.color || colors.text.onDark,
      fontFamily: buttonConfig?.fontFamily || 'Inter, sans-serif',
      fontSize:
        size === 'large' ? '28px' : size === 'medium' ? buttonConfig?.fontSize || '18px' : '16px',
      padding:
        size === 'large'
          ? '20px 40px'
          : size === 'medium'
            ? buttonConfig?.padding || '12px 24px'
            : '8px 16px',
      borderRadius: buttonConfig?.borderRadius || '6px',
      border: buttonConfig?.border || '2px solid #2C3E50',
      boxShadow: buttonConfig?.boxShadow || '3px 3px 0px #2C3E50',
      transform: buttonConfig?.transform || 'rotate(0deg)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease-out',
      overflow: 'visible' as const,
      zIndex: 1,
      opacity: disabled ? 0.6 : 1,
    };

    if (isPressed && !disabled) {
      return {
        ...baseStyles,
        transform: `${(buttonConfig as any)?.transform || 'rotate(-1deg)'} translateY(2px)`,
        boxShadow: '2px 2px 0px #2C3E50',
      };
    }

    if (isHovered && !disabled) {
      return {
        ...baseStyles,
        transform:
          (buttonConfig as any)?.hover?.transform || `${baseStyles.transform} translateY(-2px)`,
        boxShadow: (buttonConfig as any)?.hover?.boxShadow || '6px 6px 0px #2C3E50',
      };
    }

    return baseStyles;
  };

  const getParticleColors = () => {
    if ((buttonConfig as any)?.particles?.colors) {
      return (buttonConfig as any).particles.colors;
    }

    switch (variant) {
      case 'join':
        return [colors.interactive.join, colors.interactive.joinHover];
      case 'host':
        return [colors.interactive.host, colors.interactive.hostHover];
      default:
        return [colors.particles.primary, colors.particles.secondary];
    }
  };

  return (
    <button
      ref={buttonRef}
      style={getButtonStyles()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      disabled={disabled}
      className={`brush-stroke-button ${className}`.trim()}
    >
      {/* Brush stroke overlay effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(45deg, ${(buttonConfig as any)?.brushStroke?.colors?.[0] || colors.particles.primary}33, ${(buttonConfig as any)?.brushStroke?.colors?.[1] || colors.particles.secondary}33)`,
          borderRadius: 'inherit',
          opacity: isHovered ? 0.3 : 0,
          transition: 'opacity 0.2s ease-out',
          pointerEvents: 'none',
          zIndex: 0, // Fixed: use 0 instead of -1 to stay within button's stacking context
        }}
      />

      {/* Hover particle trail */}
      {isHovered && !disabled && (
        <ParticleOverlay
          particleCount={8}
          colors={getParticleColors()}
          effectType="interaction"
          className="button-particles"
        />
      )}

      {/* Click burst effect */}
      {showBurst && (
        <ParticleOverlay
          particleCount={15}
          colors={getParticleColors()}
          effectType="brushStroke"
          className="button-burst"
        />
      )}

      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </button>
  );
};

export default BrushStrokeButton;
