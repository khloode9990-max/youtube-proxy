const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());

const YTDLP = path.join(__dirname, 'yt-dlp');

app.get('/stream', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'Missing video ID' });

  const videoURL = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const proc = spawn(YTDLP, [
      '-f', 'bestaudio',
      '-o', '-',
      '--no-warnings',
      '--no-playlist',
      '--extractor-args', 'youtube:player_client=web_creator,mediaconnect',
      videoURL,
    ], { timeout: 60000 });

    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    proc.stdout.pipe(res);

    let stderr = '';
    proc.stderr.on('data', d => { stderr += d; });
    proc.on('error', (err) => {
      console.error('Spawn error:', err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Stream failed' });
    });
    proc.on('close', (code) => {
      if (code !== 0) {
        console.error('yt-dlp error:', stderr);
        if (!res.headersSent) res.status(500).json({ error: stderr || 'yt-dlp failed' });
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    if (!res.headersSent) res.status(500).json({ error: error.message || 'Failed' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', tool: 'yt-dlp' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
