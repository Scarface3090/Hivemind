import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useMemo } from 'react';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });

export const AppProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const queryClient = useMemo(() => createQueryClient(), []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
