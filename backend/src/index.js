import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { db } from './db.js';
import { scanner } from './scanner.js';
import { transcoder } from './transcoder.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Middleware ---
const logReq = (req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
};
app.use(logReq);

// --- Routes ---

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// Config
app.get('/api/config', async (req, res) => {
    const settings = await db.getSettings();
    res.json(settings);
});

app.put('/api/config', async (req, res) => {
    await db.saveSettings(req.body);
    res.json({ success: true });
});

// Library
app.get('/api/media', async (req, res) => {
    let media = await db.getAllMedia();
    const { sort, filter, limit } = req.query;

    if (filter === 'favorites') media = media.filter(m => m.is_favorite);
    if (filter === 'in_progress') media = media.filter(m => m.last_position > 0 && m.last_position < m.duration * 0.9);

    if (sort === 'added_desc') {
        media.sort((a, b) => new Date(b.added_at) - new Date(a.added_at));
    }

    if (limit) {
        media = media.slice(0, parseInt(limit));
    }

    res.json(media);
});

app.get('/api/media/:id', async (req, res) => {
    const item = await db.getMediaById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
});

app.put('/api/media/:id', async (req, res) => {
    const item = await db.getMediaById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    
    const updated = { ...item, ...req.body };
    await db.saveMediaItem(updated);
    res.json(updated);
});

app.delete('/api/media/:id', async (req, res) => {
    await db.deleteMedia(req.params.id);
    transcoder.killStream(req.params.id);
    res.json({ success: true });
});

app.put('/api/media/:id/progress', async (req, res) => {
    const { last_position } = req.body;
    await db.updateProgress(req.params.id, last_position);
    res.json({ success: true });
});

// Scanner
app.post('/api/scan', async (req, res) => {
    scanner.scanLibraries()
        .then(() => console.log('Scan background complete'))
        .catch(console.error);
    res.json({ status: 'started' });
});

// Subtitles (SRT -> VTT on the fly)
app.get('/api/subtitles/:id', async (req, res) => {
    try {
        const item = await db.getMediaById(req.params.id);
        if (!item || !item.subtitle_path || !await fs.pathExists(item.subtitle_path)) {
            return res.status(404).send('No subtitles found');
        }

        const srtContent = await fs.readFile(item.subtitle_path, 'utf8');
        
        // Simple conversion: SRT to WebVTT
        // 1. Add Header
        // 2. Convert comma decimal separator to dot in timestamps
        const vtt = "WEBVTT\n\n" + srtContent
            .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
        
        res.setHeader('Content-Type', 'text/vtt');
        res.send(vtt);
    } catch (e) {
        console.error('Subtitle error:', e);
        res.status(500).send('Error processing subtitles');
    }
});

// Streaming (HLS)
// Endpoint structure: /api/play/:id.m3u8?quality=1080p
app.get('/api/play/:id.m3u8', async (req, res) => {
    try {
        const quality = req.query.quality || '720p';
        const mediaId = req.params.id;
        
        // This creates the file structure /temp/:id/:quality/index.m3u8
        await transcoder.prepareStream(mediaId, quality);
        
        const playlistPath = transcoder.getSegment(mediaId, quality, 'index.m3u8');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.sendFile(playlistPath);
    } catch (e) {
        console.error(e);
        res.status(500).send('Transcode failed');
    }
});

// Segment serving
// Path: /api/play/:id/:quality/:segment
app.get('/api/play/:id/:quality/:segment', (req, res) => {
    const { id, quality, segment } = req.params;
    const filePath = transcoder.getSegment(id, quality, segment);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Segment not found');
    }
});

// Images
app.get('/api/image/*', (req, res) => {
    const imagePath = req.params[0];
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.redirect('https://picsum.photos/300/450?grayscale');
    }
});

// Start
app.listen(PORT, () => {
    console.log(`CactusTV Backend running on port ${PORT}`);
    
    // Initial Scan if DB is empty
    db.getAllMedia().then(m => {
        if (m.length === 0) {
            console.log('Database empty, triggering initial scan...');
            scanner.scanLibraries();
        }
    });
});