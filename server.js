const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());

const YTDLP = path.join(__dirname, 'yt-dlp');

async function tryExtract(videoId) {
  const clients = ['tv', 'ios', 'mweb', 'tv_embedded', 'web_embedded'];
  const videoURL = `https://www.youtube.com/watch?v=${videoId}`;

  for (const client of clients) {
    try {
      console.log(`Trying client: ${client}`);
      const stdout = await new Promise((resolve, reject) => {
        const proc = spawn(YTDLP, [
          '-f', 'bestaudio',
          '--get-url',
          '--no-warnings',
          '--no-playlist',
          '--extractor-args', `youtube:player_client=${client}`,
          videoURL,
        ], { timeout: 30000 });
        let out = '';
        let err = '';
        proc.stdout.on('data', d => { out += d; });
        proc.stderr.on('data', d => { err += d; });
        proc.on('close', code => {
          if (code === 0 && out.trim()) resolve(out.trim());
          else reject(new Error(err));
        });
        proc.on('error', reject);
      });
      if (stdout.startsWith('http')) return { url: stdout.split('\n')[0], client };
    } catch (e) {
      console.log(`Client ${client} failed: ${e.message.slice(0, 100)}`);
      continue;
    }
  }
  return null;
}

app.get('/stream', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'Missing video ID' });

  try {
    const result = await tryExtract(videoId);
    if (!result) return res.status(500).json({ error: 'All clients failed' });

    console.log(`Streaming via client: ${result.client}`);
    const audioRes = await fetch(result.url, {
      signal: AbortSignal.timeout(30000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!audioRes.ok) return res.status(500).json({ error: 'Audio fetch failed' });

    res.setHeader('Content-Type', audioRes.headers.get('content-type') || 'audio/webm');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    audioRes.body.pipe(res);
  } catch (error) {
    console.error('Error:', error.message);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
