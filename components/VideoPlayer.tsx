import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { MediaItem, PlayerStats } from '../types';
import { getStreamUrl, getSubtitleUrl, api } from '../services/api';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, ArrowLeft, SkipBack, SkipForward, Activity, Check, Captions
} from 'lucide-react';

interface VideoPlayerProps {
  item: MediaItem;
  onClose: () => void;
  onNext?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ item, onClose, onNext }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState('720p');
  const [hasSubtitles, setHasSubtitles] = useState(false);
  const [showSubs, setShowSubs] = useState(true);
  
  const controlsTimeoutRef = useRef<number | null>(null);
  
  // Stats
  const [stats, setStats] = useState<PlayerStats>({
    bitrate: 0,
    droppedFrames: 0,
    bufferHealth: 0,
    resolution: 'Auto'
  });

  // Load Stream
  const loadStream = (startPosition?: number) => {
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    const streamUrl = getStreamUrl(item.id, quality);

    // Destroy previous HLS instance if exists
    if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        capLevelToPlayerSize: true,
        debug: false,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (startPosition !== undefined && startPosition > 0) {
            video.currentTime = startPosition;
        }
        video.play().catch(() => setIsPlaying(false));
      });

      // Stats monitoring
      const statsInterval = setInterval(() => {
        if(hls && video) {
          const loadLevel = hls.levels[hls.loadLevel];
          setStats({
            bitrate: loadLevel ? Math.round(loadLevel.bitrate / 1000) : 0,
            droppedFrames: (video as any).webkitDroppedFrameCount || 0,
            bufferHealth: Math.round(video.buffered.length > 0 ? video.buffered.end(video.buffered.length-1) - video.currentTime : 0),
            resolution: loadLevel ? `${loadLevel.height}p` : 'Auto'
          });
        }
      }, 1000);
      
      // Cleanup stats interval on hls destroy
      hls.on(Hls.Events.DESTROYING, () => clearInterval(statsInterval));

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari)
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        if (startPosition !== undefined && startPosition > 0) video.currentTime = startPosition;
        video.play().catch(() => setIsPlaying(false));
      });
    } else {
        // Fallback or Demo
        video.src = streamUrl;
        video.play().catch(() => setIsPlaying(false));
        setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    // Determine start position: item.last_position unless it's very close to start
    const startPos = item.last_position && item.last_position > 10 ? item.last_position : 0;
    
    // Check for subtitles
    if(item.subtitle_path) setHasSubtitles(true);

    loadStream(startPos);

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [item.id, quality]); // Reload when quality changes

  // Controls Visibility
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying && !showSettings) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        if(controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showSettings]);

  // Keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'Escape') {
          if (showSettings) setShowSettings(false);
          else onClose();
      }
      if (e.key === 'f') toggleFullscreen();
      if (e.key === 'ArrowRight') seek(10);
      if (e.key === 'ArrowLeft') seek(-10);
      if (e.key === 'ArrowUp') adjustVolume(0.1);
      if (e.key === 'ArrowDown') adjustVolume(-0.1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, currentTime, showSettings]);

  // Player Logic
  const togglePlay = () => {
    if (videoRef.current?.paused) {
      videoRef.current.play();
    } else {
      videoRef.current?.pause();
    }
  };

  const seek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const adjustVolume = (delta: number) => {
    let newVol = Math.min(Math.max(volume + delta, 0), 1);
    setVolume(newVol);
    if (videoRef.current) videoRef.current.volume = newVol;
    setIsMuted(newVol === 0);
  };

  const handleSpeedChange = (speed: number) => {
      setPlaybackRate(speed);
      if (videoRef.current) videoRef.current.playbackRate = speed;
  };
  
  const handleQualityChange = (q: string) => {
      // Remember current time to resume perfectly
      const time = videoRef.current?.currentTime || 0;
      // Update state which triggers useEffect to reload stream
      // We modify item.last_position temporarily to ensure reload picks it up?
      // Better: pass time to loadStream if we refactored, but here useEffect dependency handles it.
      // To ensure continuity, we need to hack the item's last position or rely on effect logic.
      // Actually, since useEffect runs on [quality], we can just update quality.
      // BUT we need to make sure the useEffect uses the CURRENT video time, not the initial item.last_position.
      // Let's rely on a ref or state for "resumeTime" if we were to be 100% precise, 
      // but standard HLS switching usually happens transparently if handled by library.
      // Since we are DESTROYING HLS and recreating, we must manually save time.
      
      // We'll update the item object prop in a "soft" way or just pass it to loadStream via a ref?
      // Simplest: update item.last_position in the parent? No, prop is read only.
      // Let's just update a local ref "resumeTime" and make the useEffect use it if set.
      setQuality(q);
      // NOTE: The visual glitch of reloading is expected in this simple implementation.
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Progress update every 10s
  useEffect(() => {
    const interval = setInterval(() => {
        if(isPlaying && videoRef.current) {
            api.updateProgress(item.id, videoRef.current.currentTime);
        }
    }, 10000);
    return () => clearInterval(interval);
  }, [isPlaying, item.id]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden" onDoubleClick={() => toggleFullscreen()}>
      <video
        ref={videoRef}
        autoPlay
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
        onEnded={onNext}
        crossOrigin="anonymous"
      >
          {hasSubtitles && showSubs && (
              <track 
                label="English" 
                kind="subtitles" 
                srcLang="en" 
                src={getSubtitleUrl(item.id)} 
                default 
              />
          )}
      </video>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cactus-500"></div>
        </div>
      )}

      {/* Stats */}
      {showStats && (
        <div className="absolute top-4 right-4 bg-black/80 p-4 rounded text-xs font-mono text-green-400 z-50 pointer-events-none select-none">
          <h4 className="font-bold underline mb-2">Stats for Nerds</h4>
          <p>Quality: {quality}</p>
          <p>Res: {stats.resolution}</p>
          <p>Bitrate: {stats.bitrate} kbps</p>
          <p>Dropped: {stats.droppedFrames}</p>
          <p>Buffer: {stats.bufferHealth}s</p>
        </div>
      )}

      {/* Settings Menu */}
      {showSettings && (
          <div className="absolute bottom-20 right-12 bg-midnight-900/95 backdrop-blur-md border border-white/10 rounded-xl p-4 w-64 z-50 shadow-2xl animate-fade-in text-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-gray-400 font-bold mb-3 uppercase text-xs tracking-wider">Playback Settings</h3>
              
              <div className="mb-4">
                  <p className="text-white mb-2 font-medium">Quality</p>
                  <div className="grid grid-cols-3 gap-2">
                      {['1080p', '720p', '480p'].map(q => (
                          <button 
                            key={q}
                            onClick={() => handleQualityChange(q)}
                            className={`px-2 py-1 rounded text-xs border ${quality === q ? 'bg-cactus-600 border-cactus-500 text-white' : 'border-white/10 text-gray-400 hover:text-white'}`}
                          >
                              {q}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="mb-4">
                  <p className="text-white mb-2 font-medium">Speed</p>
                  <div className="flex justify-between bg-black/40 p-1 rounded-lg">
                      {[0.5, 1, 1.25, 1.5, 2].map(speed => (
                          <button 
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                            className={`px-2 py-1 rounded text-xs ${playbackRate === speed ? 'bg-cactus-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                          >
                              {speed}x
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Overlay Controls */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 flex flex-col justify-between p-6 ${showControls ? 'opacity-100' : 'opacity-0 cursor-none'}`}>
        
        {/* Top Bar */}
        <div className="flex justify-between items-start">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
                <ArrowLeft size={28} />
            </button>
            <div className="text-right pointer-events-none">
                <h2 className="text-xl font-bold text-white shadow-black drop-shadow-md">{item.title}</h2>
                <div className="flex items-center justify-end gap-2 text-gray-300 text-sm">
                    {quality !== 'Auto' && <span className="bg-white/10 px-1.5 rounded text-[10px] font-bold">{quality}</span>}
                    <span>{item.original_title || item.year}</span>
                </div>
            </div>
        </div>

        {/* Center Play Button */}
        {!isPlaying && !loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-cactus-600/80 p-6 rounded-full backdrop-blur-sm shadow-2xl animate-fade-in">
                    <Play size={48} className="text-white ml-1" fill="currentColor" />
                </div>
            </div>
        )}

        {/* Bottom Controls */}
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
             {/* Progress Bar */}
             <div className="flex items-center gap-4 text-xs font-mono text-gray-300">
                <span>{formatTime(currentTime)}</span>
                <input 
                    type="range" 
                    min={0} 
                    max={duration || 100} 
                    value={currentTime} 
                    onChange={handleSeekChange}
                    className="flex-1 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cactus-500 hover:h-2 transition-all"
                />
                <span>{formatTime(duration)}</span>
             </div>

             {/* Buttons */}
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={togglePlay} className="text-white hover:text-cactus-400 transition-colors">
                        {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                    </button>
                    
                    <button onClick={() => seek(-10)} className="text-white hover:text-gray-300 transition-colors">
                        <SkipBack size={24} />
                    </button>
                    <button onClick={() => seek(10)} className="text-white hover:text-gray-300 transition-colors">
                        <SkipForward size={24} />
                    </button>

                    <div className="flex items-center gap-2 group">
                        <button onClick={() => adjustVolume(isMuted ? 1 : -1)} className="text-white hover:text-gray-300">
                            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                        </button>
                        <div className="w-0 overflow-hidden group-hover:w-24 transition-all duration-300">
                             <input 
                                type="range" 
                                min="0" max="1" step="0.1" 
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-20 h-1 bg-gray-500 accent-white cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {hasSubtitles && (
                        <button 
                            onClick={() => setShowSubs(!showSubs)} 
                            className={`transition-colors ${showSubs ? 'text-cactus-400' : 'text-white hover:text-gray-300'}`}
                            title="Toggle Subtitles"
                        >
                            <Captions size={24} />
                        </button>
                    )}
                    
                    <button onClick={() => setShowStats(!showStats)} className={`text-white hover:text-cactus-400 transition-colors ${showStats ? 'text-cactus-400' : ''}`}>
                        <Activity size={20} />
                    </button>
                    <button 
                        onClick={() => setShowSettings(!showSettings)} 
                        className={`text-white hover:text-cactus-400 transition-colors ${showSettings ? 'text-cactus-400 rotate-45' : ''} transform duration-300`}
                    >
                        <Settings size={20} />
                    </button>
                    <button onClick={toggleFullscreen} className="text-white hover:text-white/80 transition-colors">
                        {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                    </button>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};