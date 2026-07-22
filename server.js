const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
app.use(cors());

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

    res.json({
      success: true,
      streamUrl: audioFormats[0].url,
      title: info.videoDetails.title,
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed to extract stream' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
