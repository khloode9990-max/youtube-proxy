#!/bin/bash
# Download yt-dlp binary for Linux (Render uses Linux)
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ./yt-dlp
chmod +x ./yt-dlp
echo "yt-dlp installed: $(./yt-dlp --version)"
