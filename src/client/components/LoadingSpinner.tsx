import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
}

export const LoadingSpinner = ({ 
  size = 'medium', 
  message,
  className = '' 
}: LoadingSpinnerProps): JSX.Element => {
  const sizeClass = `loading-spinner--${size}`;
  
  return (
    <div className={`loading-spinner ${sizeClass} ${className}`} role="status" aria-live="polite">
      <div className="loading-spinner__circle" aria-hidden="true">
        <div className="loading-spinner__dot loading-spinner__dot--1"></div>
        <div className="loading-spinner__dot loading-spinner__dot--2"></div>
        <div className="loading-spinner__dot loading-spinner__dot--3"></div>
      </div>
      {message && (
        <span className="loading-spinner__message">{message}</span>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;
