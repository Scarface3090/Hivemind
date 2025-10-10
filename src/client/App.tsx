import { RouterProvider, createHashRouter, isRouteErrorResponse, useRouteError, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import AppLayout from './components/AppLayout/AppLayout.js';
import HomeScreen from './views/HomeScreen/HomeScreen.js';
import GameFeed from './views/GameFeed/GameFeed.js';
import HostView from './views/HostView/HostView.js';
import GuessingView from './views/GuessingView/GuessingView.js';
import ResultsView from './views/ResultsView/ResultsView.js';
import { AppProvider } from './providers/AppProvider.js';

const RouteErrorBoundary = (): JSX.Element => {
  const error = useRouteError();

  let title = 'Router Error';
  let details = '';

  if (isRouteErrorResponse(error)) {
    details = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    details = `${error.name}: ${error.message}\n${error.stack ?? ''}`;
  } else if (typeof error === 'string') {
    details = error;
  } else if (error) {
    try {
      details = JSON.stringify(error, null, 2);
    } catch {
      details = String(error);
    }
  }

  // eslint-disable-next-line no-console
  console.error('[ROUTER] Route error', error);

  return (
    <div style={{ padding: 16 }}>
      <h2>{title}</h2>
      <pre style={{ whiteSpace: 'pre-wrap' }} id="router-error">
        {details}
      </pre>
    </div>
  );
};

const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <HomeScreen />,
      },
      {
        path: 'feed',
        element: <GameFeed />,
      },
      {
        path: 'host',
        element: <HostView />,
      },
      {
        path: 'game/:gameId',
        element: <GuessingView />,
      },
      {
        path: 'results/:gameId',
        element: <ResultsView />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

const App = (): JSX.Element => {
  useEffect(() => {
    // Basic router diagnostics once on mount
    // eslint-disable-next-line no-console
    console.log('[ROUTER] Initializing router with routes', router.routes.map((r) => r.path));

    // Capture router navigation errors (React Router emits to console by default; we add clarity)
    const handleRouterError = (e: any) => {
      // eslint-disable-next-line no-console
      console.error('[ROUTER] Error event', e?.detail ?? e);
    };

    (window as any).addEventListener?.('rr:error', handleRouterError);

    // Cleanup function to remove event listener and prevent memory leaks
    return () => {
      (window as any).removeEventListener?.('rr:error', handleRouterError);
    };
  }, []); // Empty dependency array ensures this runs only once

  return (
    <AppProvider>
      <RouterProvider
        router={router}
        future={{ v7_startTransition: true }}
        fallbackElement={<div>Loading...</div>}
      />
    </AppProvider>
  );
};

export default App;
