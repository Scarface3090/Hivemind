import { useMemo } from 'react';
import StartGame from './game/main';

const App = () => {
  useMemo(() => {
    StartGame('game-container');
  }, []);

  return (
    <div id='app-root' className='min-h-screen bg-dark-gray text-white'>
      <main className='h-full'>
        <div id='game-container' className='w-full h-full'></div>
      </main>
    </div>
  );
};

export default App;

