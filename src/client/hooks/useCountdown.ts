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
    const totalMinutes = Math.floor(remainingMs / 60000);
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [remainingMs]);

  return { formatted, remainingMs, isExpired };
}

export default useCountdown;


