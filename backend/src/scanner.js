import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import ffmpeg from 'fluent-ffmpeg';
import { db } from './db.js';
import { tmdb } from './tmdb.js';
import { nanoid } from 'nanoid';

const EXTENSIONS = ['mkv', 'mp4', 'avi', 'mov', 'm4v', 'webm'];

const getMetadata = (filePath) => {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) resolve(null);
      else resolve(metadata);
    });
  });
};

// Returns { title, year, season, episode }
function parseFilename(filename) {
    const clean = filename.replace(/\./g, ' ').replace(/_/g, ' ');
    
    // Match S01E01 or 1x01
    const showMatch = clean.match(/s(\d+)[e|x](\d+)/i) || clean.match(/(\d+)x(\d+)/i);
    const yearMatch = clean.match(/(\d{4})/);
    
    let title = clean;
    let year = null;
    let season = null;
    let episode = null;

    if (showMatch) {
        season = parseInt(showMatch[1]);
        episode = parseInt(showMatch[2]);
        const idx = clean.indexOf(showMatch[0]);
        title = clean.substring(0, idx).trim();
    } else if (yearMatch) {
        year = parseInt(yearMatch[1]);
        const idx = clean.indexOf(yearMatch[1]);
        title = clean.substring(0, idx).trim();
    }

    // Cleaning
    title = title.replace(/(\(|\[).*(\)|\])/g, '')
                 .replace(/1080p|720p|4k|bluray|x264|x265|hevc|web-dl|dvdrip/gi, '')
                 .replace(/-/g, '')
                 .trim();

    return { title, year, season, episode };
}

export const scanner = {
  scanLibraries: async () => {
    console.log('[Scanner] Starting library scan...');
    const settings = await db.getSettings();
    const existingMedia = await db.getAllMedia(); // Need this to preserve IDs? Actually db.js handles it.
    
    let allFiles = [];
    for (const libPath of settings.libraryPaths) {
        if (!fs.existsSync(libPath)) continue;
        const files = await glob(`${libPath}/**/*.{${EXTENSIONS.join(',')}}`, { windowsPathsNoEscape: true });
        allFiles = [...allFiles, ...files];
    }

    console.log(`[Scanner] Processing ${allFiles.length} files...`);

    const movies = [];
    const showsMap = {}; // Key: Title, Value: { ...showData, episodes: [] }

    for (const file of allFiles) {
        const filename = path.basename(file);
        const { title, year, season, episode } = parseFilename(filename);
        
        // Check for sidecar subs
        const baseName = file.substring(0, file.lastIndexOf('.'));
        const srtPath = `${baseName}.srt`;
        const hasSubtitles = await fs.pathExists(srtPath) ? srtPath : null;

        const meta = await getMetadata(file);
        const duration = meta?.format?.duration ? Math.floor(meta.format.duration) : 0;

        if (season !== null && episode !== null) {
            // It's a Show
            const showKey = title.toLowerCase();
            
            if (!showsMap[showKey]) {
                showsMap[showKey] = {
                    id: nanoid(),
                    title: title, // Capitalized from filename usually
                    type: 'SHOW',
                    year: year || new Date().getFullYear(),
                    duration: 0, // Sum later?
                    path: path.dirname(file), // Path to show folder (approx)
                    added_at: new Date().toISOString(),
                    last_position: 0,
                    is_favorite: false,
                    episodes: []
                };
            }

            showsMap[showKey].episodes.push({
                id: nanoid(),
                title: `Episode ${episode}`,
                type: 'EPISODE',
                season_number: season,
                episode_number: episode,
                year: year,
                duration: duration,
                path: file,
                subtitle_path: hasSubtitles,
                added_at: new Date().toISOString(),
                last_position: 0
            });

        } else {
            // It's a Movie
            movies.push({
                id: nanoid(),
                title: title || filename,
                type: 'MOVIE',
                year: year || new Date().getFullYear(),
                duration: duration,
                path: file,
                subtitle_path: hasSubtitles,
                added_at: new Date().toISOString(),
                last_position: 0,
                is_favorite: false
            });
        }
    }

    // Process Shows: Fetch Metadata and sort episodes
    const shows = Object.values(showsMap);
    
    // TMDB Enrichment for Shows
    if (settings.tmdbApiKey) {
        for (const show of shows) {
            console.log(`[Scanner] TMDB Lookup for Show: ${show.title}`);
            const searchRes = await tmdb.searchMulti(show.title, null, settings.tmdbApiKey);
            if (searchRes) {
                const details = await tmdb.getDetails(searchRes.id, 'tv', settings.tmdbApiKey);
                Object.assign(show, {
                    ...details,
                    title: searchRes.name || show.title
                });
            }
            // Sort episodes S1E1, S1E2...
            show.episodes.sort((a, b) => {
                if (a.season_number !== b.season_number) return a.season_number - b.season_number;
                return a.episode_number - b.episode_number;
            });
            await new Promise(r => setTimeout(r, 200));
        }

        // TMDB Enrichment for Movies
        for (const movie of movies) {
             console.log(`[Scanner] TMDB Lookup for Movie: ${movie.title}`);
             const searchRes = await tmdb.searchMulti(movie.title, movie.year, settings.tmdbApiKey);
             if (searchRes) {
                 const details = await tmdb.getDetails(searchRes.id, 'movie', settings.tmdbApiKey);
                 Object.assign(movie, {
                     ...details,
                     title: searchRes.title || movie.title
                 });
             }
             await new Promise(r => setTimeout(r, 200));
        }
    }

    const finalLibrary = [...movies, ...shows];
    
    // Use replaceLibrary to merge with existing data (preserving progress/IDs)
    const saved = await db.replaceLibrary(finalLibrary);
    
    console.log(`[Scanner] Scan complete. ${saved.length} items.`);
    return saved;
  }
};