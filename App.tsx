import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Library } from './pages/Library';
import { Settings } from './pages/Settings';
import { Onboarding } from './pages/Onboarding';
import { MediaType } from './types';
import { api } from './services/api';
import { Loader2, WifiOff } from 'lucide-react';

const App: React.FC = () => {
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const onboarded = localStorage.getItem('cactus_onboarding_complete') === 'true';
      const url = localStorage.getItem('cactus_server_url');

      if (!onboarded || !url) {
        setIsOnboarded(false);
        return;
      }

      setIsOnboarded(true);
      
      // Verify connection
      const online = await api.checkConnection(url);
      setIsConnected(online);
    };

    checkStatus();
  }, []);

  if (isOnboarded === null) {
    return (
      <div className="min-h-screen bg-midnight-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-cactus-500" size={48} />
      </div>
    );
  }

  if (!isOnboarded) {
    return <Onboarding onComplete={() => window.location.reload()} />;
  }

  if (isConnected === false) {
     return (
        <div className="min-h-screen bg-midnight-950 flex flex-col items-center justify-center text-center p-4">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500">
                <WifiOff size={48} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Connection Lost</h1>
            <p className="text-gray-400 max-w-md mb-8">
                Cannot reach the CactusTV server at <span className="font-mono text-cactus-400 bg-black/30 px-2 py-0.5 rounded">{localStorage.getItem('cactus_server_url')}</span>. 
                Please ensure the backend Docker container is running.
            </p>
            <div className="flex gap-4">
                <button 
                    onClick={() => window.location.reload()} 
                    className="px-6 py-3 bg-cactus-600 text-white rounded-xl hover:bg-cactus-500 font-bold transition-colors"
                >
                    Retry Connection
                </button>
                <button 
                    onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                    }} 
                    className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 font-bold transition-colors"
                >
                    Reset App
                </button>
            </div>
        </div>
     );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="movies" element={<Library title="Movies" typeFilter={MediaType.MOVIE} />} />
          <Route path="shows" element={<Library title="TV Shows" typeFilter={MediaType.SHOW} />} />
          <Route path="music" element={<Library title="Music" typeFilter={MediaType.MUSIC} />} />
          <Route path="favorites" element={<Library title="Favorites" favoritesOnly={true} />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;