const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const YTDLP = path.join(__dirname, 'yt-dlp');
const COOKIES_FILE = path.join(__dirname, 'cookies.txt');

function getCookieSource() {
  // Check env var first (set in Render dashboard)
  if (process.env.YT_COOKIES && process.env.YT_COOKIES.length > 10) {
    // Write env var to file if not already written
    if (!fs.existsSync(COOKIES_FILE) || fs.readFileSync(COOKIES_FILE, 'utf8') !== process.env.YT_COOKIES) {
      fs.writeFileSync(COOKIES_FILE, process.env.YT_COOKIES);
    }
    return 'env';
  }
  // Check file
  if (fs.existsSync(COOKIES_FILE) && fs.statSync(COOKIES_FILE).size > 10) {
    return 'file';
  }
  return null;
}

app.get('/stream', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'Missing video ID' });

  const videoURL = `https://www.youtube.com/watch?v=${videoId}`;
  const cookieSource = getCookieSource();

  const args = ['-f', 'bestaudio', '-o', '-', '--no-warnings', '--no-playlist'];
  if (cookieSource) {
    args.push('--cookies', COOKIES_FILE);
    console.log(`Using cookies (source: ${cookieSource})`);
  } else {
    console.log('No cookies — likely to fail');
  }
  args.push(videoURL);

  try {
    const proc = spawn(YTDLP, args, { timeout: 60000 });
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
        console.error('yt-dlp error:', stderr.slice(0, 500));
        if (!res.headersSent) res.status(500).json({ error: stderr.slice(0, 500) });
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

// Upload cookies via POST (for easy updating)
app.post('/cookies', express.text(), (req, res) => {
  try {
    fs.writeFileSync(COOKIES_FILE, req.body);
    res.json({ success: true, message: 'Cookies updated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', cookies: getCookieSource() || 'none' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy on port ${PORT} | Cookies: ${getCookieSource() || 'none'}`));
