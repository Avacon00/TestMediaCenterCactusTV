import React, { useState } from 'react';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { Server, CheckCircle, Wifi, Globe, LayoutTemplate } from 'lucide-react';

export const Onboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async (isDemo = false) => {
    setLoading(true);
    setError('');
    
    let url = serverUrl;
    if (isDemo) {
        url = 'demo';
    } else {
        // Normalize URL
        url = serverUrl.replace(/\/$/, ""); 
        if (!url.startsWith('http')) url = `http://${url}`;
    }

    const isConnected = await api.checkConnection(url);

    if (isConnected) {
      localStorage.setItem('cactus_server_url', url);
      setStep(3);
    } else {
      setError('Could not connect to CactusTV server. Please check the URL and ensure the backend is running.');
    }
    setLoading(false);
  };

  const finish = () => {
    localStorage.setItem('cactus_onboarding_complete', 'true');
    onComplete();
  };

  return (
    <div className="min-h-screen bg-midnight-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cactus-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-lg bg-midnight-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10">
        {/* Progress */}
        <div className="flex justify-between mb-8 px-4">
           {[1, 2, 3].map(i => (
             <div key={i} className={`h-1 flex-1 mx-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-cactus-500' : 'bg-white/10'}`} />
           ))}
        </div>

        {step === 1 && (
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 bg-cactus-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-cactus-400">
               <Server size={40} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Welcome to CactusTV</h1>
            <p className="text-gray-400 mb-8">
              Your next-generation personal media server frontend. Let's connect you to your library.
            </p>
            <div className="space-y-3">
                <Button size="lg" onClick={() => setStep(2)} className="w-full">
                Get Started
                </Button>
                <Button variant="ghost" onClick={() => handleConnect(true)} className="w-full text-xs text-cactus-400 hover:text-cactus-300">
                    <LayoutTemplate size={14} className="mr-2"/> Try Demo Mode (Design Test)
                </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Connect to Server</h2>
            <p className="text-gray-400 mb-6 text-sm">Enter the IP address or URL of your running CactusTV Node.js backend.</p>
            
            <div className="space-y-4">
              <div className="relative">
                <Globe className="absolute left-4 top-3.5 text-gray-500" size={20} />
                <input 
                  type="text" 
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cactus-500 focus:ring-1 focus:ring-cactus-500 outline-none transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                  {error}
                </div>
              )}

              <Button 
                size="lg" 
                onClick={() => handleConnect(false)} 
                disabled={loading} 
                className="w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                    <span className="animate-pulse">Connecting...</span>
                ) : (
                    <>
                    <Wifi size={18} /> Connect
                    </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center animate-fade-in">
             <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
               <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Connected Successfully!</h2>
            <p className="text-gray-400 mb-8">
              Your library is ready to be explored. Enjoy your content in style.
            </p>
            <Button size="lg" onClick={finish} className="w-full">
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};