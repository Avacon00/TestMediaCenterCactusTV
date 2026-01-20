import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ServerConfig } from '../types';
import { Button } from '../components/Button';
import { Save, FolderPlus, Trash2, RefreshCw, Cpu, Database, Check, Key } from 'lucide-react';

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [newPath, setNewPath] = useState('');
  
  // Scan States
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success'>('idle');
  
  // Form States
  const [tmdbKey, setTmdbKey] = useState('');

  useEffect(() => {
    api.getConfig().then(data => {
        setConfig(data);
        if(data.tmdbApiKey) setTmdbKey(data.tmdbApiKey);
    });
  }, []);

  const handleScan = async () => {
    setScanStatus('scanning');
    await api.triggerScan();
    setScanStatus('success');
    
    // Reset back to idle after 3 seconds
    setTimeout(() => {
        setScanStatus('idle');
    }, 3000);
  };

  const saveConfig = async () => {
      if(!config) return;
      // In a real app this would save to backend
      const updatedConfig = { ...config, tmdbApiKey: tmdbKey };
      setConfig(updatedConfig);
      // Mock save implementation if needed in api service
      // await api.saveConfig(updatedConfig);
      alert("Configuration saved!");
  };

  if (!config) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <Button onClick={saveConfig} icon={<Save size={18}/>}>Save Changes</Button>
      </div>

      <div className="space-y-8">
        
        {/* Media Scanner / Libraries */}
        <section className="bg-midnight-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-cactus-400">
                    <Database size={24} />
                    <h2 className="text-xl font-bold text-white">Media Libraries</h2>
                </div>
                
                <Button 
                    variant={scanStatus === 'success' ? 'primary' : 'secondary'}
                    size="sm" 
                    icon={
                        scanStatus === 'scanning' ? <RefreshCw size={16} className="animate-spin" /> : 
                        scanStatus === 'success' ? <Check size={16} /> : 
                        <RefreshCw size={16} />
                    } 
                    onClick={handleScan}
                    disabled={scanStatus === 'scanning'}
                    className={`transition-all duration-300 ${scanStatus === 'success' ? 'bg-green-600 hover:bg-green-600 border-green-500' : ''}`}
                >
                    {scanStatus === 'scanning' ? 'Scanning Library...' : 
                     scanStatus === 'success' ? 'Done!' : 'Scan Now'}
                </Button>
            </div>

            <div className="space-y-4">
                {config.libraryPaths.length === 0 && <p className="text-gray-500 italic text-sm">No libraries configured.</p>}
                
                {config.libraryPaths.map(path => (
                    <div key={path} className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5">
                        <span className="font-mono text-sm text-gray-300">{path}</span>
                        <button className="text-red-500 hover:text-red-400 p-2"><Trash2 size={16} /></button>
                    </div>
                ))}

                <div className="flex gap-2 pt-2">
                    <input 
                        type="text" 
                        value={newPath}
                        onChange={(e) => setNewPath(e.target.value)}
                        placeholder="/path/to/media"
                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-cactus-500 focus:ring-1 focus:ring-cactus-500 outline-none transition-all"
                    />
                    <Button size="sm" icon={<FolderPlus size={16} />}>Add</Button>
                </div>
            </div>
        </section>

        {/* Metadata Providers */}
        <section className="bg-midnight-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
             <div className="flex items-center gap-3 text-cactus-400 mb-6">
                <Key size={24} />
                <h2 className="text-xl font-bold text-white">Metadata Providers</h2>
            </div>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">The Movie Database (TMDB) API Key</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={tmdbKey}
                            onChange={(e) => setTmdbKey(e.target.value)}
                            placeholder="Enter your TMDB API Key"
                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-4 pr-12 text-sm text-white focus:border-cactus-500 focus:ring-1 focus:ring-cactus-500 outline-none transition-all font-mono"
                        />
                        {tmdbKey && <div className="absolute right-3 top-2.5 text-green-500"><Check size={18} /></div>}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Required to fetch metadata (posters, cast, descriptions) for your media.</p>
                </div>
            </div>
        </section>

        {/* Transcoding */}
        <section className="bg-midnight-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
             <div className="flex items-center gap-3 text-cactus-400 mb-6">
                <Cpu size={24} />
                <h2 className="text-xl font-bold text-white">Transcoding</h2>
            </div>
            
            <div className="space-y-4">
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                    <div>
                        <span className="block font-medium text-white group-hover:text-cactus-400 transition-colors">Enable Transcoding</span>
                        <span className="text-xs text-gray-500">Allow server to convert video on the fly for better compatibility.</span>
                    </div>
                    <input type="checkbox" checked={config.transcodingEnabled} readOnly className="w-5 h-5 accent-cactus-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                    <div>
                        <span className="block font-medium text-white group-hover:text-cactus-400 transition-colors">Hardware Acceleration (VAAPI)</span>
                        <span className="text-xs text-gray-500">Use Intel QuickSync for faster encoding and lower CPU usage.</span>
                    </div>
                    <input type="checkbox" checked={config.hardwareAcceleration} readOnly className="w-5 h-5 accent-cactus-600 rounded" />
                </label>
            </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-900/10 border border-red-500/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-red-500 mb-4">Danger Zone</h2>
            <div className="flex items-center justify-between">
                <p className="text-sm text-red-400/70">Reset the application frontend state. This will disconnect you from the server.</p>
                <Button variant="danger" size="sm" onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                }}>
                    Reset App
                </Button>
            </div>
        </section>

      </div>
    </div>
  );
};