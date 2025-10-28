import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

// Simplified pass-through component - no longer an error boundary
// Context errors are now handled gracefully in the useGameContext hook
export const GameContextErrorBoundary = ({ children }: Props): JSX.Element => {
  return <>{children}</>;
};
