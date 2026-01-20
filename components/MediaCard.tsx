import React, { useState } from 'react';
import { MediaItem, MediaType } from '../types';
import { getImageUrl } from '../services/api';
import { Play, Heart, MoreVertical } from 'lucide-react';

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  aspectRatio?: 'poster' | 'square';
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onClick, aspectRatio = 'poster' }) => {
  const [isHovered, setIsHovered] = useState(false);

  const aspectClass = aspectRatio === 'poster' ? 'aspect-[2/3]' : 'aspect-square';
  const progressPercent = item.last_position && item.duration 
    ? Math.min((item.last_position / item.duration) * 100, 100) 
    : 0;

  return (
    <div 
      className="group relative flex flex-col gap-2 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(item)}
    >
      {/* Image Container */}
      <div className={`relative w-full ${aspectClass} rounded-xl overflow-hidden bg-midnight-900 shadow-xl transition-all duration-300 ease-out group-hover:scale-105 group-hover:shadow-cactus-900/30 group-hover:shadow-2xl ring-1 ring-white/10`}>
        <img 
          src={getImageUrl(item.poster_path)} 
          alt={item.title} 
          className="w-full h-full object-cover transition-opacity duration-300"
          loading="lazy"
        />
        
        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
          <button className="bg-cactus-600 text-white p-4 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform hover:bg-cactus-500">
            <Play fill="currentColor" size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-midnight-950/50">
            <div 
              className="h-full bg-cactus-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Type Badge */}
        {item.type === MediaType.SHOW && (
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">
            TV
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-1">
        <h3 className="font-semibold text-gray-200 truncate group-hover:text-cactus-400 transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-gray-500 flex items-center justify-between">
          <span>{item.year}</span>
          {item.is_favorite && <Heart size={12} className="text-red-500 fill-red-500" />}
        </p>
      </div>
    </div>
  );
};