export enum MediaType {
  MOVIE = 'MOVIE',
  SHOW = 'SHOW',
  MUSIC = 'MUSIC',
  EPISODE = 'EPISODE'
}

export interface MediaItem {
  id: string;
  title: string;
  original_title?: string;
  type: MediaType;
  year: number;
  duration: number; // in seconds
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  path: string;
  subtitle_path?: string | null; // New: Path to local .srt file
  added_at: string;
  last_position?: number; // resume point
  is_favorite?: boolean;
  video_codec?: string;
  has_hdr?: boolean;
  genres?: string[];
  trailer_url?: string; // YouTube ID or URL
  cast?: CastMember[];
  episodes?: MediaItem[]; // For Shows
  season_number?: number; // For Episodes
  episode_number?: number; // For Episodes
}

export interface CastMember {
  id: string;
  name: string;
  character: string;
  profile_path?: string;
}

export interface ServerConfig {
  serverUrl: string;
  libraryPaths: string[];
  transcodingEnabled: boolean;
  hardwareAcceleration: boolean;
  tmdbApiKey?: string;
}

export interface PlayerStats {
  bitrate: number;
  droppedFrames: number;
  bufferHealth: number;
  resolution: string;
}