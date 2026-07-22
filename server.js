const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
app.use(cors());

// Stream audio through the proxy (avoids YouTube IP restrictions)
app.get('/stream', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing video ID' });
  }

  try {
    const videoURL = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(videoURL);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

    if (audioFormats.length === 0) {
      return res.status(404).json({ error: 'No audio streams found' });
    }

    // Return metadata as JSON for the first request
    if (req.query.meta === '1') {
      return res.json({
        success: true,
        title: info.videoDetails.title,
      });
    }

    // Stream the audio directly through the proxy
    const stream = ytdl(videoURL, { filter: 'audioonly', quality: 'highestaudio' });

    res.setHeader('Content-Type', audioFormats[0].mimeType || 'audio/webm');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');

    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('Stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream failed' });
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to extract stream' });
    }
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
