import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

// Early boot diagnostics
(() => {
  // Basic environment info
  console.log('[BOOT] Starting client', {
    href: typeof window !== 'undefined' ? window.location.href : 'no-window',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'no-navigator',
    time: new Date().toISOString(),
  });

  // Global error handlers for uncaught errors/rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (e) => {
      console.error('[BOOT] Uncaught error', { message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno, error: e.error });
    });
    window.addEventListener('unhandledrejection', (e) => {
      console.error('[BOOT] Unhandled promise rejection', e.reason);
    });
  }
})();

const rootElement = document.getElementById('root') as HTMLElement | null;
if (!rootElement) {
  console.error('[BOOT] Root element #root not found');
} else {
  console.log('[BOOT] Mounting React app');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

