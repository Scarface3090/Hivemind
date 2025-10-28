interface GameContextRouterProps {
  children: React.ReactNode;
}

// Temporarily disabled context detection to prevent errors during normal browsing
// TODO: Re-enable with proper error handling once the root cause is identified
export const GameContextRouter = ({ children }: GameContextRouterProps): JSX.Element => {
  console.log('[GameContextRouter] Context detection temporarily disabled for stability');
  return <>{children}</>;
};
