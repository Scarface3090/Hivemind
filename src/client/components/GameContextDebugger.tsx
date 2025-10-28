import { useState, useEffect } from 'react';
import { useGameContextDebug } from '../hooks/useGameContextDebug.js';

interface GameContextDebuggerProps {
  children: React.ReactNode;
}

export const GameContextDebugger = ({ children }: GameContextDebuggerProps): JSX.Element => {
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('/');

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    setDebugLog(prev => [...prev.slice(-20), logEntry]); // Keep last 20 entries
  };

  // Safely get current path without using useLocation hook
  useEffect(() => {
    const updatePath = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      if (debugEnabled) {
        addLog(`Location changed to: ${path}`);
      }
    };
    
    updatePath(); // Initial path
    
    // Listen for navigation changes
    window.addEventListener('popstate', updatePath);
    
    return () => {
      window.removeEventListener('popstate', updatePath);
    };
  }, [debugEnabled]);

  const { gameId, isDirectGameAccess, isLoading, error, debugInfo } = useGameContextDebug(debugEnabled);

  useEffect(() => {
    if (debugEnabled) {
      addLog(`Context result: gameId=${gameId}, isDirectGameAccess=${isDirectGameAccess}, isLoading=${isLoading}, error=${error?.message || 'none'}`);
    }
  }, [debugEnabled, gameId, isDirectGameAccess, isLoading, error]);

  // Check for debug mode via URL parameter or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get('debug');
    const debugStorage = localStorage.getItem('gameContextDebug');
    
    if (debugParam === 'context' || debugStorage === 'true') {
      setDebugEnabled(true);
      addLog('Debug mode enabled');
    }
  }, []);

  // Render debug panel if enabled
  if (debugEnabled) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ 
          backgroundColor: '#f0f0f0', 
          padding: '10px', 
          borderBottom: '1px solid #ccc',
          maxHeight: '200px',
          overflow: 'auto'
        }}>
          <h4>Game Context Debugger</h4>
          <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            <div>Current Path: {currentPath}</div>
            <div>Game ID: {gameId || 'null'}</div>
            <div>Direct Access: {isDirectGameAccess ? 'true' : 'false'}</div>
            <div>Loading: {isLoading ? 'true' : 'false'}</div>
            <div>Error: {error?.message || 'none'}</div>
            <div>Query Enabled: {debugInfo.queryEnabled ? 'true' : 'false'}</div>
          </div>
          <button 
            onClick={() => {
              setDebugEnabled(false);
              localStorage.removeItem('gameContextDebug');
            }}
            style={{ marginTop: '5px', fontSize: '12px' }}
          >
            Disable Debug
          </button>
          <button 
            onClick={() => {
              localStorage.setItem('gameContextDebug', 'true');
              window.location.reload();
            }}
            style={{ marginTop: '5px', marginLeft: '5px', fontSize: '12px' }}
          >
            Enable Context Query
          </button>
          <div style={{ marginTop: '10px', maxHeight: '100px', overflow: 'auto' }}>
            <strong>Debug Log:</strong>
            {debugLog.map((log, index) => (
              <div key={index} style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                {log}
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
