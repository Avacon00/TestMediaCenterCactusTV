import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { MediaItem, MediaType } from '../types';
import { MediaCard } from '../components/MediaCard';
import { VideoPlayer } from '../components/VideoPlayer';
import { MediaDetailsModal } from '../components/MediaDetailsModal';
import { FixedSizeGrid as Grid } from 'react-window';
import { AutoSizer } from '../components/AutoSizer';
import { Search, Filter, Loader2 } from 'lucide-react';

interface LibraryProps {
  typeFilter?: MediaType;
  favoritesOnly?: boolean;
  title: string;
}

export const Library: React.FC<LibraryProps> = ({ typeFilter, favoritesOnly, title }) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  const fetchLibrary = () => {
      setLoading(true);
      const promise = favoritesOnly ? api.getFavorites() : api.getAllMedia();
      
      promise
        .then(data => {
            let filtered = data;
            if (typeFilter) {
                filtered = data.filter(i => i.type === typeFilter);
            }
            setItems(filtered);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLibrary();
  }, [typeFilter, favoritesOnly]);

  const filteredItems = useMemo(() => {
      return items.filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [items, searchTerm]);

  const handlePlayFromModal = (item: MediaItem) => {
      setSelectedItem(null);
      setPlayingItem(item);
  };

  // Virtualization config
  const COLUMN_WIDTH = 200;
  const ROW_HEIGHT = 320;
  const GUTTER = 24;

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-cactus-500" size={40}/></div>;

  return (
    <div className="h-screen flex flex-col p-8 pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
            <p className="text-gray-400 text-sm">{filteredItems.length} titles</p>
        </div>

        <div className="flex items-center gap-4">
            <div className="relative group">
                <Search className="absolute left-3 top-2.5 text-gray-500 group-focus-within:text-cactus-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search library..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-midnight-900 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-cactus-500 focus:border-cactus-500 outline-none w-64 transition-all"
                />
            </div>
            {!favoritesOnly && (
                <button className="p-2 bg-midnight-900 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20">
                    <Filter size={20} />
                </button>
            )}
        </div>
      </div>

      {/* Grid Area */}
      <div className="flex-1 -mx-8">
        {filteredItems.length === 0 ? (
             <div className="h-full flex items-center justify-center text-gray-500">No items found</div>
        ) : (
            <AutoSizer>
            {({ height, width }) => {
                const columnCount = Math.floor((width - 64) / (COLUMN_WIDTH + GUTTER)); // 64 is padding
                const rowCount = Math.ceil(filteredItems.length / columnCount);
                const safeColumnCount = columnCount > 0 ? columnCount : 1;
                
                // Centering logic
                const totalContentWidth = safeColumnCount * COLUMN_WIDTH + (safeColumnCount - 1) * GUTTER;
                const offsetX = (width - totalContentWidth) / 2;

                return (
                <Grid
                    columnCount={safeColumnCount}
                    columnWidth={COLUMN_WIDTH + GUTTER}
                    height={height}
                    rowCount={rowCount}
                    rowHeight={ROW_HEIGHT}
                    width={width}
                    className="no-scrollbar"
                    style={{ overflowX: 'hidden' }}
                >
                    {({ columnIndex, rowIndex, style }) => {
                        const index = rowIndex * safeColumnCount + columnIndex;
                        if (index >= filteredItems.length) return null;
                        const item = filteredItems[index];

                        return (
                            <div style={{
                                ...style,
                                left: (Number(style.left) || 0) + offsetX,
                                top: (Number(style.top) || 0),
                                width: COLUMN_WIDTH,
                                height: ROW_HEIGHT - 20
                            }}>
                                <MediaCard 
                                    item={item} 
                                    onClick={setSelectedItem} 
                                    aspectRatio={typeFilter === MediaType.MUSIC ? 'square' : 'poster'}
                                />
                            </div>
                        );
                    }}
                </Grid>
                );
            }}
            </AutoSizer>
        )}
      </div>

      {/* Details Modal */}
      {selectedItem && (
          <MediaDetailsModal 
             item={selectedItem} 
             onClose={() => setSelectedItem(null)} 
             onPlay={handlePlayFromModal}
             onDelete={fetchLibrary}
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