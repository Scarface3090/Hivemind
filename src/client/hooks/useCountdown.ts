import { useEffect, useMemo, useState } from 'react';

export function useCountdown(endTime: string): {
  formatted: string;
  remainingMs: number;
  isExpired: boolean;
} {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = useMemo(() => new Date(endTime).getTime(), [endTime]);
  const remainingMs = Math.max(0, target - now);
  const isExpired = remainingMs === 0;

  const formatted = useMemo(() => {
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [remainingMs]);

  return { formatted, remainingMs, isExpired };
}

export default useCountdown;


