const express = require('express');
const cors = require('cors');
const { execFile, spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());

const YTDLP = path.join(__dirname, 'yt-dlp');

function runYtdlp(args) {
  return new Promise((resolve, reject) => {
    execFile(YTDLP, args, { timeout: 30000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

app.get('/stream', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'Missing video ID' });

  const videoURL = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    if (req.query.meta === '1') {
      const title = await runYtdlp(['--get-title', '--no-warnings', videoURL]);
      return res.json({ success: true, title: title || 'YouTube Audio' });
    }

    const proc = spawn(YTDLP, [
      '-f', 'bestaudio',
      '-o', '-',
      '--no-warnings',
      '--no-playlist',
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
