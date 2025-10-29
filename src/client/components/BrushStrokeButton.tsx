import React, { useState, useRef, useCallback } from 'react';
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
  size = 'medium'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const buttonConfig = components.buttons[variant] as any; // Type assertion for design system access
  
  const handleClick = useCallback(() => {
    if (disabled || !onClick) return;
    
    // Trigger burst effect
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 600);
    
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

  const getButtonStyles = () => {
    const baseStyles = {
      position: 'relative' as const,
      background: buttonConfig.background,
      color: buttonConfig.color,
      fontFamily: buttonConfig.fontFamily,
      fontSize: size === 'large' ? '28px' : size === 'medium' ? buttonConfig.fontSize : '16px',
      padding: size === 'large' ? '20px 40px' : size === 'medium' ? buttonConfig.padding : '8px 16px',
      borderRadius: buttonConfig.borderRadius,
      border: buttonConfig.border,
      boxShadow: buttonConfig.boxShadow,
      transform: buttonConfig.transform,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease-out',
      overflow: 'visible' as const,
      zIndex: 1,
      opacity: disabled ? 0.6 : 1,
    };

    if (isPressed && !disabled) {
      return {
        ...baseStyles,
        transform: `${buttonConfig.transform} translateY(2px)`,
        boxShadow: '2px 2px 0px #2C3E50',
      };
    }

    if (isHovered && !disabled) {
      return {
        ...baseStyles,
        transform: buttonConfig.hover.transform,
        boxShadow: buttonConfig.hover.boxShadow,
      };
    }

    return baseStyles;
  };

  const getParticleColors = () => {
    if (buttonConfig.particles?.colors) {
      return buttonConfig.particles.colors;
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
          background: `linear-gradient(45deg, ${buttonConfig.brushStroke?.colors?.[0] || colors.particles.primary}33, ${buttonConfig.brushStroke?.colors?.[1] || colors.particles.secondary}33)`,
          borderRadius: 'inherit',
          opacity: isHovered ? 0.3 : 0,
          transition: 'opacity 0.2s ease-out',
          pointerEvents: 'none',
          zIndex: -1,
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
      
      <span style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </span>
    </button>
  );
};

export default BrushStrokeButton;
