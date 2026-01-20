import { MediaItem, ServerConfig, MediaType } from '../types';

// Helper to get the base URL from local storage
const getBaseUrl = () => localStorage.getItem('cactus_server_url') || '';
const isDemo = () => getBaseUrl() === 'demo';

const headers = {
  'Content-Type': 'application/json',
};

// --- MOCK DATA FOR DESIGN TESTING ---
const MOCK_MEDIA: MediaItem[] = [
  {
    id: '1',
    title: 'Dune: Part Two',
    original_title: 'Dune: Part Two',
    type: MediaType.MOVIE,
    year: 2024,
    duration: 9960,
    overview: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee. The saga continues as Paul rises to become the messiah of the Fremen, leading them in a holy war against the tyranny of the Galaxy. As the conflict escalates, alliances are tested, and the destiny of Arrakis hangs in the balance.",
    poster_path: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
    path: '/media/movies/dune2.mkv',
    added_at: new Date().toISOString(),
    last_position: 1200,
    is_favorite: true,
    video_codec: 'h265',
    has_hdr: true,
    genres: ['Science Fiction', 'Adventure'],
    trailer_url: 'Way9Dexny3w',
    cast: [
        { id: 'c1', name: 'Timothée Chalamet', character: 'Paul Atreides', profile_path: 'https://image.tmdb.org/t/p/w200/BE2sdjpgEHr2rjJfCaPPOe7uyX.jpg' },
        { id: 'c2', name: 'Zendaya', character: 'Chani', profile_path: 'https://image.tmdb.org/t/p/w200/cbCib5I3A5w1h9Qj0tNqYm3W5d.jpg' },
        { id: 'c3', name: 'Rebecca Ferguson', character: 'Lady Jessica', profile_path: 'https://image.tmdb.org/t/p/w200/lJloTOheuQSirSLXNA3jhzrCwBA.jpg' }
    ]
  },
  {
    id: '2',
    title: 'Interstellar',
    type: MediaType.MOVIE,
    year: 2014,
    duration: 10140,
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    poster_path: 'https://image.tmdb.org/t/p/w500/gEU2QniL6E77NI6lCU6MxlNBvIx.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
    path: '/media/movies/interstellar.mkv',
    added_at: new Date(Date.now() - 10000000).toISOString(),
    is_favorite: false,
    genres: ['Science Fiction', 'Drama'],
    trailer_url: 'zSWdZVtXT7E',
    cast: [
        { id: 'c4', name: 'Matthew McConaughey', character: 'Cooper', profile_path: 'https://image.tmdb.org/t/p/w200/e9ZHRY5saZR7Wg7TjdZ89FzL8aY.jpg' }
    ]
  }
];

export const api = {
  // Connection Check
  checkConnection: async (url: string): Promise<boolean> => {
    if (url === 'demo') return true;
    try {
      const res = await fetch(`${url}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  // Media Endpoints
  getAllMedia: async (): Promise<MediaItem[]> => {
    if (isDemo()) return new Promise(r => setTimeout(() => r(MOCK_MEDIA), 500));
    const res = await fetch(`${getBaseUrl()}/api/media`, { headers });
    if (!res.ok) throw new Error('Failed to fetch media');
    return res.json();
  },

  getMediaById: async (id: string): Promise<MediaItem> => {
    if (isDemo()) {
        const item = MOCK_MEDIA.find(m => m.id === id);
        if (!item) throw new Error('Not found');
        return new Promise(r => setTimeout(() => r(item), 200));
    }
    const res = await fetch(`${getBaseUrl()}/api/media/${id}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch media details');
    return res.json();
  },

  getRecent: async (): Promise<MediaItem[]> => {
    if (isDemo()) return new Promise(r => setTimeout(() => r([...MOCK_MEDIA].sort((a,b) => b.added_at.localeCompare(a.added_at))), 400));
    const res = await fetch(`${getBaseUrl()}/api/media?sort=added_desc&limit=20`, { headers });
    if (!res.ok) return [];
    return res.json();
  },

  getContinueWatching: async (): Promise<MediaItem[]> => {
    if (isDemo()) return new Promise(r => setTimeout(() => r(MOCK_MEDIA.filter(m => m.last_position && m.last_position > 0)), 400));
    const res = await fetch(`${getBaseUrl()}/api/media?filter=in_progress`, { headers });
    if (!res.ok) return [];
    return res.json();
  },
  
  getFavorites: async (): Promise<MediaItem[]> => {
    if (isDemo()) return new Promise(r => setTimeout(() => r(MOCK_MEDIA.filter(m => m.is_favorite)), 400));
    const res = await fetch(`${getBaseUrl()}/api/media?filter=favorites`, { headers });
    if (!res.ok) return [];
    return res.json();
  },

  // Actions
  toggleFavorite: async (id: string, isFavorite: boolean) => {
    if (isDemo()) {
        const item = MOCK_MEDIA.find(m => m.id === id);
        if (item) item.is_favorite = isFavorite;
        return;
    }
    await fetch(`${getBaseUrl()}/api/media/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ is_favorite: isFavorite })
    });
  },

  updateMedia: async (id: string, data: Partial<MediaItem>) => {
    if (isDemo()) {
        const item = MOCK_MEDIA.find(m => m.id === id);
        if (item) Object.assign(item, data);
        return;
    }
    await fetch(`${getBaseUrl()}/api/media/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
  },

  updateProgress: async (id: string, time: number) => {
    if (isDemo()) return;
    fetch(`${getBaseUrl()}/api/media/${id}/progress`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ last_position: time })
    }).catch(() => {});
  },

  deleteMedia: async (id: string) => {
    if (isDemo()) {
        const idx = MOCK_MEDIA.findIndex(m => m.id === id);
        if (idx > -1) MOCK_MEDIA.splice(idx, 1);
        return;
    }
    await fetch(`${getBaseUrl()}/api/media/${id}`, { method: 'DELETE', headers });
  },

  // Settings
  getConfig: async (): Promise<ServerConfig> => {
     if (isDemo()) {
         return {
             serverUrl: 'Demo Mode',
             libraryPaths: ['/media/movies', '/media/shows', '/media/music'],
             transcodingEnabled: true,
             hardwareAcceleration: true,
             tmdbApiKey: 'f5bc6f3b0f07245ca5e2bd457d8891aa'
         };
     }
     const res = await fetch(`${getBaseUrl()}/api/config`, { headers });
     if (!res.ok) return {
         serverUrl: getBaseUrl(),
         libraryPaths: [],
         transcodingEnabled: true,
         hardwareAcceleration: false
     }
     return res.json();
  },
  
  setConfig: async (config: Partial<ServerConfig>) => {
      if(isDemo()) return;
      await fetch(`${getBaseUrl()}/api/config`, { method: 'PUT', headers, body: JSON.stringify(config)});
  },

  triggerScan: async () => {
    // In Demo mode, we just return a promise that resolves after 2 seconds to simulate scanning
    if (isDemo()) return new Promise(resolve => setTimeout(resolve, 3000));
    
    await fetch(`${getBaseUrl()}/api/scan`, { method: 'POST', headers });
  }
};

// Image Helper
export const getImageUrl = (path?: string) => {
  if (!path) return 'https://picsum.photos/300/450?grayscale'; 
  if (path.startsWith('http')) return path;
  if (isDemo()) return 'https://picsum.photos/300/450?grayscale';
  return `${getBaseUrl()}/api/image/${path}`;
};

export const getStreamUrl = (id: string, quality = '720p') => {
  if (isDemo()) return 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'; // Public test stream
  return `${getBaseUrl()}/api/play/${id}.m3u8?quality=${quality}`;
};

export const getSubtitleUrl = (id: string) => {
  if (isDemo()) return '';
  return `${getBaseUrl()}/api/subtitles/${id}`;
};