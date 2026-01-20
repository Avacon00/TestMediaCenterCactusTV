import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';
import { db } from './db.js';

const TEMP_DIR = '/app/temp';

// Clean temp on startup to remove stale segments
fs.emptyDirSync(TEMP_DIR);

const activeTranscodes = new Map();

// HW Accel Strategy from Environment
const HW_ACCEL_MODE = process.env.FFMPEG_HWACCEL || 'cpu'; // cpu, cuda, qsv, vaapi

const PROFILES = {
    '1080p': { bitrate: '8000k', size: '1920x1080' },
    '720p': { bitrate: '4500k', size: '1280x720' },
    '480p': { bitrate: '1500k', size: '854x480' },
    '360p': { bitrate: '800k', size: '640x360' }
};

const getEncoderOptions = (mode, quality) => {
    const profile = PROFILES[quality] || PROFILES['720p'];
    
    let inputOptions = [];
    let videoCodec = 'libx264';
    
    // Base output options for HLS compatibility
    let outputOptions = [
        '-preset veryfast', 
        `-b:v ${profile.bitrate}`,
        '-maxrate:v ' + profile.bitrate,
        '-bufsize:v ' + parseInt(profile.bitrate) * 2 + 'k',
        '-g 48', // Keyframe interval ~2s for 24fps
        '-sc_threshold 0',
        '-sn', // Disable subtitles in video stream (handled via VTT)
        '-map_metadata -1',
        '-pix_fmt yuv420p' // Ensure 8-bit output for browser compatibility
    ];

    switch (mode) {
        case 'cuda': // NVIDIA NVENC
            inputOptions = [
                '-hwaccel cuda', 
                '-hwaccel_output_format cuda'
            ];
            videoCodec = 'h264_nvenc';
            outputOptions = [
                '-preset p4', // NVENC specific preset
                '-tune hq',
                `-b:v ${profile.bitrate}`,
                '-g 48',
                '-sn',
                // Using scale_cuda filter for resizing on GPU
                `-vf scale_cuda=w=${profile.size.split('x')[0]}:h=${profile.size.split('x')[1]}`,
                '-pix_fmt yuv420p'
            ];
            break;

        case 'qsv': // INTEL QuickSync
            inputOptions = [
                '-hwaccel qsv', 
                '-c:v h264_qsv'
            ];
            videoCodec = 'h264_qsv';
            outputOptions = [
                '-preset veryfast',
                '-look_ahead 0',
                `-b:v ${profile.bitrate}`,
                '-g 48',
                '-sn',
                // QSV scaling usually managed by driver or vf, but simple size() works often. 
                // Explicitly setting pix_fmt nv12 is preferred for QSV internal pipeline
                '-pix_fmt nv12' 
            ];
            break;

        case 'vaapi': // INTEL/AMD VAAPI (Generic)
            inputOptions = [
                '-hwaccel vaapi', 
                '-hwaccel_output_format vaapi', 
                '-vaapi_device /dev/dri/renderD128'
            ];
            videoCodec = 'h264_vaapi';
            outputOptions = [
                 // Scaling happens via filter inside ffmpeg execution
                 `-vf format=nv12,hwupload,scale_vaapi=w=${profile.size.split('x')[0]}:h=${profile.size.split('x')[1]}`,
                 `-b:v ${profile.bitrate}`,
                 '-g 48',
                 '-sn'
            ];
            break;
    }

    return { inputOptions, videoCodec, outputOptions };
};

export const transcoder = {
  prepareStream: async (mediaId, quality = '1080p') => {
    const media = await db.getMediaById(mediaId);
    if (!media) throw new Error('Media not found');

    const profile = PROFILES[quality] || PROFILES['1080p'];
    
    const outputDir = path.join(TEMP_DIR, mediaId, quality);
    const playlistPath = path.join(outputDir, 'index.m3u8');
    const key = `${mediaId}-${quality}`;

    // Return existing stream immediately if ready
    if (await fs.pathExists(playlistPath)) {
        return `/api/play/${mediaId}/${quality}/index.m3u8`;
    }

    await fs.ensureDir(outputDir);

    // Join existing transcode if active (Dedup)
    if (activeTranscodes.has(key)) {
         return new Promise((resolve) => {
             const check = setInterval(async () => {
                 if (await fs.pathExists(playlistPath)) {
                     clearInterval(check);
                     resolve(`/api/play/${mediaId}/${quality}/index.m3u8`);
                 }
             }, 500);
         });
    }

    // Config Check
    const settings = await db.getSettings();
    const useHw = settings.transcodingEnabled && settings.hardwareAcceleration;
    const mode = useHw ? HW_ACCEL_MODE : 'cpu';
    
    const { inputOptions, videoCodec, outputOptions } = getEncoderOptions(mode, quality);

    return new Promise((resolve, reject) => {
      const command = ffmpeg(media.path)
        .inputOptions(inputOptions)
        .videoCodec(videoCodec)
        // AUDIO STRATEGY: Passthrough (Dolby Atmos / 5.1 support)
        // -c:a copy preserves the original bitstream (AC3, EAC3, DTS, AAC).
        // HLS MPEG-TS container supports most of these. Modern browsers/OS/Receivers handle the rest.
        // If 'copy' fails for specific formats (like TrueHD in MPEGTS), FFmpeg might error, 
        // but for standard MKV sources this enables Atmos support.
        .audioCodec('copy') 
        .outputOptions([
            ...outputOptions,
            '-hls_time 4',
            '-hls_list_size 0',
            '-hls_segment_type mpegts',
            '-hls_segment_filename', path.join(outputDir, 'seg_%03d.ts'),
            // Explicitly map first video and first audio
            '-map 0:v:0',
            '-map 0:a:0?'
        ])
        .on('start', (cmd) => {
          console.log(`[Transcoder] Started [${mode.toUpperCase()}] ${quality}: ${media.title}`);
          console.log(`[FFmpeg] ${cmd}`);
        })
        .on('error', (err) => {
          if (!err.message.includes('SIGKILL')) {
              console.error(`[Transcoder] Error: ${err.message}`);
          }
          activeTranscodes.delete(key);
        })
        .on('end', () => {
            console.log(`[Transcoder] Finished ${quality}: ${media.title}`);
            activeTranscodes.delete(key);
        });

      // Apply .size() only for modes that don't use scaling filters (CPU/QSV)
      // Note: QSV can use filters, but fluent-ffmpeg .size() is a safe fallback for CPU
      if (mode === 'cpu' || mode === 'qsv') {
          command.size(profile.size);
      }

      command.output(playlistPath).run();
      activeTranscodes.set(key, command);

      // Poll for initial file to return quickly
      const checkInterval = setInterval(async () => {
         if (await fs.pathExists(playlistPath)) {
             clearInterval(checkInterval);
             resolve(`/api/play/${mediaId}/${quality}/index.m3u8`);
         }
      }, 500);

      // Safety timeout
      setTimeout(() => {
          clearInterval(checkInterval);
          if (!activeTranscodes.has(key) && !fs.existsSync(playlistPath)) {
            reject(new Error('Timeout waiting for transcoder to start'));
          }
      }, 30000);
    });
  },

  killStream: (mediaId) => {
      // Kill all qualities for this media
      for (const q of Object.keys(PROFILES)) {
          const key = `${mediaId}-${q}`;
          const cmd = activeTranscodes.get(key);
          if (cmd) {
              cmd.kill('SIGKILL');
              activeTranscodes.delete(key);
          }
      }
      // Cleanup temp files
      fs.remove(path.join(TEMP_DIR, mediaId)).catch(() => {});
  },

  getSegment: (mediaId, quality, segment) => {
      return path.join(TEMP_DIR, mediaId, quality, segment);
  }
};