import React, { useEffect, useState } from 'react';
import { api, getImageUrl } from '../services/api';
import { MediaItem } from '../types';
import { MediaCard } from '../components/MediaCard';
import { Button } from '../components/Button';
import { Play, Info, ChevronRight, Loader2 } from 'lucide-react';
import { VideoPlayer } from '../components/VideoPlayer';
import { MediaDetailsModal } from '../components/MediaDetailsModal';

export const Dashboard: React.FC = () => {
  const [recent, setRecent] = useState<MediaItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<MediaItem[]>([]);
  const [featured, setFeatured] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  
  // States for Modals
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  const loadData = async () => {
    try {
        const [recentData, cwData] = await Promise.all([
            api.getRecent(),
            api.getContinueWatching()
        ]);
        setRecent(recentData);
        setContinueWatching(cwData);
        if (recentData.length > 0) setFeatured(recentData[0]);
    } catch (e) {
        console.error("Failed to load dashboard data", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePlayFromModal = (item: MediaItem) => {
      setSelectedItem(null); // Close details
      setPlayingItem(item); // Open player
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-cactus-500" size={40}/></div>;

  return (
    <div className="pb-20">
      {/* Hero Section */}
      {featured ? (
        <div className="relative h-[80vh] w-full overflow-hidden">
            <div className="absolute inset-0">
                <img 
                    src={getImageUrl(featured.backdrop_path || featured.poster_path)} 
                    className="w-full h-full object-cover"
                    alt="Hero"
                />
                {/* Darker gradient at bottom to ensure separation and readability of overlap content */}
                <div className="absolute inset-0 bg-gradient-to-t from-midnight-950 via-midnight-950/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-midnight-950/90 via-midnight-950/30 to-transparent" />
            </div>
            
            <div className="absolute bottom-0 left-0 p-8 md:p-16 pb-24 md:pb-32 max-w-3xl z-10">
                <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-2xl">{featured.title}</h1>
                <p className="text-gray-200 text-lg md:text-xl mb-8 line-clamp-3 max-w-2xl drop-shadow-md font-medium">
                    {featured.overview || "No description available."}
                </p>
                <div className="flex items-center gap-4">
                    <Button size="lg" icon={<Play fill="currentColor" size={20} />} onClick={() => setPlayingItem(featured)}>
                        Play Now
                    </Button>
                    <Button variant="secondary" size="lg" icon={<Info size={20} />} onClick={() => setSelectedItem(featured)}>
                        More Info
                    </Button>
                </div>
            </div>
        </div>
      ) : (
          <div className="h-[50vh] flex flex-col items-center justify-center text-gray-500">
              <Info size={48} className="mb-4 opacity-50"/>
              <p>No media found. Add folders in Settings.</p>
          </div>
      )}

      {/* Sections */}
      <div className="px-8 -mt-20 md:-mt-24 relative z-20 space-y-12">
        
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
            <section>
                <SectionHeader title="Continue Watching" />
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {continueWatching.map(item => (
                        <MediaCard key={item.id} item={item} onClick={setSelectedItem} />
                    ))}
                </div>
            </section>
        )}

        {/* Recently Added */}
        <section>
            <SectionHeader title="Recently Added" />
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {recent.map(item => (
                    <MediaCard key={item.id} item={item} onClick={setSelectedItem} />
                ))}
            </div>
        </section>
      </div>

      {/* Details Modal */}
      {selectedItem && (
          <MediaDetailsModal 
             item={selectedItem} 
             onClose={() => setSelectedItem(null)} 
             onPlay={handlePlayFromModal}
             onDelete={loadData}
          />
      )}

      {/* Video Player */}
      {playingItem && (
          <VideoPlayer 
            item={playingItem} 
            onClose={() => setPlayingItem(null)} 
          />
      )}
    </div>
  );
};

const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3 drop-shadow-md">
            <div className="w-1.5 h-6 bg-cactus-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            {title}
        </h2>
        <button className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-semibold">
            View All <ChevronRight size={16} />
        </button>
    </div>
);