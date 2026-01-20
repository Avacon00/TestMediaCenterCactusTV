import fs from 'fs-extra';
import path from 'path';

const CONFIG_DIR = '/app/config';
const DB_FILE = path.join(CONFIG_DIR, 'db.json');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');

// Ensure config dir exists
fs.ensureDirSync(CONFIG_DIR);

// Default Data
const defaultSettings = {
  serverUrl: 'http://localhost:3000',
  libraryPaths: ['/media'],
  transcodingEnabled: true,
  hardwareAcceleration: false,
  tmdbApiKey: ''
};

const defaultDb = {
  media: []
};

// Helper to read/write JSON
async function readJson(file, defaults) {
  try {
    if (!await fs.pathExists(file)) {
      await fs.writeJson(file, defaults, { spaces: 2 });
      return defaults;
    }
    return await fs.readJson(file);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return defaults;
  }
}

export const db = {
  getSettings: async () => readJson(SETTINGS_FILE, defaultSettings),
  
  saveSettings: async (settings) => {
    const current = await readJson(SETTINGS_FILE, defaultSettings);
    await fs.writeJson(SETTINGS_FILE, { ...current, ...settings }, { spaces: 2 });
  },

  getAllMedia: async () => {
    const data = await readJson(DB_FILE, defaultDb);
    return data.media;
  },

  getMediaById: async (id) => {
    const data = await readJson(DB_FILE, defaultDb);
    
    // Direct match (Movie or Show)
    const direct = data.media.find(m => m.id === id);
    if (direct) return direct;

    // Deep search for Episodes inside Shows
    for (const item of data.media) {
        if (item.type === 'SHOW' && item.episodes) {
            const ep = item.episodes.find(e => e.id === id);
            if (ep) return ep;
        }
    }
    return undefined;
  },

  saveMediaItem: async (item) => {
    const data = await readJson(DB_FILE, defaultDb);
    const index = data.media.findIndex(m => m.id === item.id);
    
    if (index >= 0) {
      data.media[index] = { ...data.media[index], ...item };
    } else {
      data.media.push(item);
    }
    
    await fs.writeJson(DB_FILE, data, { spaces: 2 });
    return item;
  },

  updateProgress: async (id, time) => {
    const data = await readJson(DB_FILE, defaultDb);
    
    // Check top level
    let item = data.media.find(m => m.id === id);
    if (item) {
        item.last_position = time;
        await fs.writeJson(DB_FILE, data);
        return;
    }

    // Check nested episodes
    for (const media of data.media) {
        if (media.type === 'SHOW' && media.episodes) {
            const ep = media.episodes.find(e => e.id === id);
            if (ep) {
                ep.last_position = time;
                // Also update the parent Show's "last watched" marker could be useful here
                // For now, simple save
                await fs.writeJson(DB_FILE, data);
                return;
            }
        }
    }
  },

  deleteMedia: async (id) => {
    const data = await readJson(DB_FILE, defaultDb);
    data.media = data.media.filter(m => m.id !== id);
    await fs.writeJson(DB_FILE, data, { spaces: 2 });
  },

  replaceLibrary: async (newMediaList) => {
     const currentData = await readJson(DB_FILE, defaultDb);
     
     // Create lookup map for existing data (Movies and Shows)
     // For Shows, we want to preserve episode progress too.
     const lookup = new Map();
     
     const addToLookup = (items) => {
         items.forEach(m => {
             lookup.set(m.path, m);
             if (m.episodes) addToLookup(m.episodes);
         });
     };
     addToLookup(currentData.media);

     // Recursive merge function
     const mergeItem = (newItem) => {
         const existing = lookup.get(newItem.path);
         let merged = { ...newItem };

         if (existing) {
             merged.id = existing.id;
             merged.is_favorite = existing.is_favorite;
             merged.last_position = existing.last_position;
             merged.added_at = existing.added_at;
         }

         if (newItem.episodes) {
             merged.episodes = newItem.episodes.map(ep => mergeItem(ep));
         }

         return merged;
     };

     const mergedList = newMediaList.map(item => mergeItem(item));

     await fs.writeJson(DB_FILE, { media: mergedList }, { spaces: 2 });
     return mergedList;
  }
};