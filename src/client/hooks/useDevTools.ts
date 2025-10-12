import { useQuery } from '@tanstack/react-query';

const SECRET_KEY = 'devtools.secret';

export interface DevToolsStatus {
  enabled: boolean;
  secretRequired: boolean;
}

export function useDevTools() {
  const { data } = useQuery<DevToolsStatus>({
    queryKey: ['devtools-status'],
    queryFn: async () => {
      const res = await fetch('/api/dev/status');
      if (!res.ok) return { enabled: false, secretRequired: false };
      return (await res.json()) as DevToolsStatus;
    },
    staleTime: 60_000,
  });

  const secret = typeof window !== 'undefined' ? localStorage.getItem(SECRET_KEY) || '' : '';
  const setSecret = (s: string): void => {
    if (typeof window !== 'undefined') localStorage.setItem(SECRET_KEY, s);
  };
  const headers = secret ? ({ 'x-dev-secret': secret } as const) : undefined;

  return {
    enabled: Boolean(data?.enabled),
    secretRequired: Boolean(data?.secretRequired),
    secret,
    setSecret,
    headers,
  } as const;
}


