import React, { useState, useMemo } from 'react';
import { MediaItem, MediaType } from '../types';
import { getImageUrl, api } from '../services/api';
import { Button } from './Button';
import { Play, RotateCcw, Heart, MoreVertical, X, Edit, Trash2, Calendar, Clock, Film, ChevronDown, ChevronUp, User, Captions, Tv, CheckCircle2 } from 'lucide-react';

interface MediaDetailsModalProps {
  item: MediaItem;
  onClose: () => void;
  onPlay: (item: MediaItem) => void;
  onDelete?: () => void;
}

export const MediaDetailsModal: React.FC<MediaDetailsModalProps> = ({ item: initialItem, onClose, onPlay, onDelete }) => {
  const [item, setItem] = useState(initialItem);
  // If it's a show, default to 'episodes' tab, otherwise 'overview'
  const [activeTab, setActiveTab] = useState<'overview' | 'cast' | 'trailer' | 'episodes'>(
      initialItem.type === MediaType.SHOW ? 'episodes' : 'overview'
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);

  // Derive Seasons for Shows
  const seasons = useMemo(() => {
      if (!item.episodes) return [];
      const s = new Set<number>(item.episodes.map(e => e.season_number || 1));
      return Array.from(s).sort((a: number, b: number) => a - b);
  }, [item]);

  // Derive Episodes for selected season
  const currentEpisodes = useMemo(() => {
      if (!item.episodes) return [];
      return item.episodes.filter(e => (e.season_number || 1) === selectedSeason)
          .sort((a,b) => (a.episode_number || 0) - (b.episode_number || 0));
  }, [item, selectedSeason]);

  // Determine Resume logic for Shows
  const nextEpisodeToWatch = useMemo(() => {
      if (item.type !== MediaType.SHOW || !item.episodes) return null;
      // Find first episode that is "in progress" or not fully watched?
      // For now, let's just pick the first one, or if we had global progress tracking, we'd pick that.
      // Logic: Find last watched episode.
      const lastWatched = item.episodes.filter(e => e.last_position && e.last_position > 0)
                          .sort((a,b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime())[0]; // Sort logic is weak here without 'last_watched_at' timestamp
      return lastWatched || item.episodes[0];
  }, [item]);

  const handleToggleFavorite = async () => {
    const newVal = !item.is_favorite;
    setItem({ ...item, is_favorite: newVal });
    await api.toggleFavorite(item.id, newVal);
  };

  const handleEditTitle = async () => {
    const newTitle = prompt("Edit Title", item.title);
    if (newTitle && newTitle !== item.title) {
        setItem({ ...item, title: newTitle });
        await api.updateMedia(item.id, { title: newTitle });
        setIsMenuOpen(false);
    }
  };

  const handleDelete = async () => {
      await api.deleteMedia(item.id);
      if (onDelete) onDelete();
      onClose();
  };

  const formatDuration = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const isShow = item.type === MediaType.SHOW;
  const hasResumePoint = !isShow && item.last_position && item.last_position > 30 && item.last_position < (item.duration - 60);

  const handleMainPlay = () => {
      if (isShow && nextEpisodeToWatch) {
          onPlay(nextEpisodeToWatch);
      } else {
          onPlay(item);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-midnight-950 w-full max-w-5xl h-[90vh] md:h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row animate-fade-in">
        
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white transition-colors">
            <X size={24} />
        </button>

        <div className="hidden md:block w-1/3 relative bg-black h-full">
             <img 
                src={getImageUrl(item.poster_path)} 
                className="w-full h-full object-cover opacity-90" 
                alt={item.title}
             />
             <div className="absolute inset-0 bg-gradient-to-r from-transparent to-midnight-950/80" />
             <div className="absolute inset-0 bg-gradient-to-t from-midnight-950/50 to-transparent" />
        </div>

        <div className="flex-1 flex flex-col relative h-full min-h-0">
            <div className="absolute inset-0 z-0 opacity-20 md:hidden">
                 <img src={getImageUrl(item.backdrop_path || item.poster_path)} className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-midnight-950/90" />
            </div>

            <div className="relative z-10 p-6 md:p-8 pb-0 shrink-0">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-md line-clamp-2 leading-tight">{item.title}</h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 font-medium">
                        <span className="flex items-center gap-1"><Calendar size={14}/> {item.year}</span>
                        {!isShow && <span className="flex items-center gap-1"><Clock size={14}/> {formatDuration(item.duration)}</span>}
                        {isShow && <span className="flex items-center gap-1"><Tv size={14}/> {item.episodes?.length || 0} Episodes</span>}
                        
                        {item.genres?.slice(0,3).map(g => (
                            <span key={g} className="px-2 py-0.5 bg-white/10 rounded-md text-xs">{g}</span>
                        ))}
                         {item.has_hdr && <span className="px-2 py-0.5 border border-cactus-500/50 text-cactus-400 rounded-md text-[10px] font-bold">HDR</span>}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-6">
                    {/* Main Action Button */}
                    <Button icon={<Play fill="currentColor" size={20} />} onClick={handleMainPlay}>
                        {isShow ? (nextEpisodeToWatch ? `Continue S${nextEpisodeToWatch.season_number} E${nextEpisodeToWatch.episode_number}` : 'Play Series') : (hasResumePoint ? 'Resume' : 'Play')}
                    </Button>
                    
                    {!isShow && hasResumePoint && (
                        <Button variant="secondary" icon={<RotateCcw size={20} />} onClick={() => onPlay({...item, last_position: 0})}>
                             Start Over
                        </Button>
                    )}
                   
                    <button 
                        onClick={handleToggleFavorite}
                        className={`p-3 rounded-xl border transition-all ${item.is_favorite ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                    >
                        <Heart size={20} fill={item.is_favorite ? "currentColor" : "none"} />
                    </button>
                    
                    <div className="relative">
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white"
                        >
                            <MoreVertical size={20} />
                        </button>
                        
                        {isMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-midnight-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-30 animate-fade-in">
                                {showDeleteConfirm ? (
                                    <div className="p-3">
                                        <p className="text-xs text-red-400 mb-2">Are you sure? This cannot be undone.</p>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="danger" onClick={handleDelete} className="flex-1">Yes</Button>
                                            <Button size="sm" variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="flex-1">No</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <button onClick={handleEditTitle} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2">
                                            <Edit size={16} /> Edit Title
                                        </button>
                                        <button onClick={() => setShowDeleteConfirm(true)} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 border-t border-white/5">
                                            <Trash2 size={16} /> Delete Media
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {!isShow && hasResumePoint && <p className="text-xs text-cactus-400 mt-2 font-mono ml-1">Resume at {Math.floor(item.last_position! / 60)}m</p>}
            </div>

            <div className="relative z-10 px-6 md:px-8 mt-8 border-b border-white/5 flex gap-8 shrink-0 overflow-x-auto no-scrollbar">
                {isShow && (
                     <button 
                        onClick={() => setActiveTab('episodes')} 
                        className={`pb-4 text-sm font-bold uppercase tracking-wide transition-colors border-b-2 whitespace-nowrap ${activeTab === 'episodes' ? 'text-cactus-500 border-cactus-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                    >
                        Episodes
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('overview')} 
                    className={`pb-4 text-sm font-bold uppercase tracking-wide transition-colors border-b-2 whitespace-nowrap ${activeTab === 'overview' ? 'text-cactus-500 border-cactus-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                >
                    Overview
                </button>
                <button 
                    onClick={() => setActiveTab('cast')} 
                    className={`pb-4 text-sm font-bold uppercase tracking-wide transition-colors border-b-2 whitespace-nowrap ${activeTab === 'cast' ? 'text-cactus-500 border-cactus-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                >
                    Cast & Crew
                </button>
                <button 
                    onClick={() => setActiveTab('trailer')} 
                    className={`pb-4 text-sm font-bold uppercase tracking-wide transition-colors border-b-2 whitespace-nowrap ${activeTab === 'trailer' ? 'text-cactus-500 border-cactus-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                >
                    Trailer
                </button>
            </div>

            <div className="relative z-10 p-6 md:p-8 flex-1 overflow-y-auto min-h-0 no-scrollbar">
                
                {activeTab === 'episodes' && isShow && (
                    <div className="animate-fade-in">
                        {/* Season Selector */}
                        {seasons.length > 0 && (
                            <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
                                {seasons.map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => setSelectedSeason(s)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedSeason === s ? 'bg-cactus-600 text-white shadow-lg shadow-cactus-900/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                    >
                                        Season {s}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Episodes List */}
                        <div className="space-y-2">
                            {currentEpisodes.map(ep => {
                                const epProgress = ep.last_position && ep.duration ? (ep.last_position / ep.duration) * 100 : 0;
                                const isWatched = epProgress > 90;
                                
                                return (
                                    <div key={ep.id} className="group flex items-center gap-4 bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
                                        {/* Play Icon / Number */}
                                        <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-black/40 text-gray-400 font-mono text-sm group-hover:bg-cactus-600 group-hover:text-white transition-all cursor-pointer" onClick={() => onPlay(ep)}>
                                            <Play size={16} className="hidden group-hover:block ml-0.5" fill="currentColor"/>
                                            <span className="group-hover:hidden">{ep.episode_number}</span>
                                        </div>

                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onPlay(ep)}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-white truncate">{ep.title}</h4>
                                                {isWatched && <CheckCircle2 size={14} className="text-cactus-500" />}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span>{formatDuration(ep.duration)}</span>
                                                {ep.subtitle_path && <span className="flex items-center gap-0.5"><Captions size={10}/> CC</span>}
                                            </div>
                                            {/* Episode Progress Bar */}
                                            {epProgress > 0 && epProgress < 90 && (
                                                <div className="mt-2 h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-cactus-500" style={{ width: `${epProgress}%` }} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="hidden md:block">
                                            <Button size="sm" variant="ghost" icon={<Play size={14}/>} onClick={() => onPlay(ep)}>
                                                Play
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                            {currentEpisodes.length === 0 && (
                                <p className="text-gray-500 italic">No episodes found for this season.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'overview' && (
                    <div className="animate-fade-in">
                        <div className="mb-6 relative">
                            <p className={`text-gray-300 leading-relaxed text-lg transition-all duration-200 ${!isDescExpanded ? 'line-clamp-5' : ''}`}>
                                {item.overview || "No synopsis available for this title."}
                            </p>
                            {(item.overview && item.overview.length > 250) && (
                                <button 
                                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                                    className="mt-2 text-cactus-400 hover:text-cactus-300 text-sm font-bold flex items-center gap-1 focus:outline-none"
                                >
                                    {isDescExpanded ? (
                                        <>Show Less <ChevronUp size={14}/></>
                                    ) : (
                                        <>Read More <ChevronDown size={14}/></>
                                    )}
                                </button>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm text-gray-400 border-t border-white/5 pt-6">
                             <div>
                                 <span className="block text-gray-500 text-xs uppercase mb-1 font-bold">Original Title</span>
                                 <span className="text-gray-200">{item.original_title || item.title}</span>
                             </div>
                             <div>
                                 <span className="block text-gray-500 text-xs uppercase mb-1 font-bold">File Path</span>
                                 <span className="break-all font-mono text-xs opacity-70 block">{item.path}</span>
                             </div>
                             <div>
                                 <span className="block text-gray-500 text-xs uppercase mb-1 font-bold">Added to Library</span>
                                 <span className="text-gray-200">{new Date(item.added_at).toLocaleDateString()}</span>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'cast' && (
                    <div className="animate-fade-in">
                        {item.cast && item.cast.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {item.cast.map(member => (
                                    <div key={member.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors group">
                                        <div className="w-16 h-16 shrink-0 rounded-full overflow-hidden bg-black/40 ring-2 ring-white/10 group-hover:ring-cactus-500/50 transition-all">
                                            {member.profile_path ? (
                                                <img 
                                                    src={getImageUrl(member.profile_path)} 
                                                    className="w-full h-full object-cover object-top" 
                                                    alt={member.name} 
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-500 bg-midnight-900">
                                                    <User size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-white font-bold text-base truncate leading-tight">{member.name}</p>
                                            <p className="text-cactus-400 text-sm truncate mt-1">{member.character}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                                <p>No cast information available.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'trailer' && (
                    <div className="animate-fade-in h-full flex items-center justify-center min-h-[400px]">
                        {item.trailer_url ? (
                             <div className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
                                 <iframe 
                                    width="100%" 
                                    height="100%" 
                                    src={`https://www.youtube.com/embed/${item.trailer_url}?origin=${window.location.origin}&modestbranding=1&rel=0&iv_load_policy=3`} 
                                    title="YouTube video player" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                    referrerPolicy="no-referrer"
                                    className="border-none"
                                 ></iframe>
                             </div>
                        ) : (
                            <div className="text-center py-12">
                                <Film size={48} className="mx-auto text-gray-600 mb-4 opacity-50" />
                                <p className="text-gray-500">No trailer available for this title.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
};