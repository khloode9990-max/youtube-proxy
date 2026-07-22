const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

async function cobaltDownload(videoId) {
  const res = await fetch('https://api.cobalt.tools/', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      audioFormat: 'mp3',
      isAudioOnly: true,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.url) return data.url;
  return null;
}

async function pipedStream(videoId) {
  const instances = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.yt',
    'https://watchapi.whatever.social',
    'https://pipedapi.r4fo.com',
  ];
  for (const inst of instances) {
    try {
      const res = await fetch(`${inst}/streams/${videoId}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const data = await res.json();
      const audio = (data.audioStreams || [])
        .filter(s => s.mimeType?.startsWith('audio/'))
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      if (audio.length > 0 && audio[0].url) return audio[0].url;
    } catch { continue; }
  }
  return null;
}

app.get('/stream', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'Missing video ID' });

  try {
    // Try cobalt first
    const cobaltUrl = await cobaltDownload(videoId);
    if (cobaltUrl) {
      const audioRes = await fetch(cobaltUrl, { signal: AbortSignal.timeout(30000) });
      if (audioRes.ok) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return audioRes.body.pipe(res);
      }
    }

    // Try Piped instances
    const pipedUrl = await pipedStream(videoId);
    if (pipedUrl) {
      const audioRes = await fetch(pipedUrl, {
        signal: AbortSignal.timeout(30000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (audioRes.ok) {
        res.setHeader('Content-Type', audioRes.headers.get('content-type') || 'audio/webm');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return audioRes.body.pipe(res);
      }
    }

    res.status(500).json({ error: 'All extraction methods failed' });
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
