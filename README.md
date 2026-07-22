# YouTube Proxy Server

## Deploy to Render.com (Free)

1. Push this `youtube-proxy` folder to a new GitHub repo
2. Go to https://render.com → Sign up (free)
3. Click **New** → **Web Service**
4. Connect your GitHub repo
5. Settings:
   - Name: `youtube-proxy`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Click **Create Web Service**
7. Wait for deploy → copy the URL (e.g. `https://youtube-proxy-xxxx.onrender.com`)
8. Paste the URL in your MusicWidget settings

## Local Testing

```bash
cd youtube-proxy
npm install
npm start
# Test: http://localhost:3000/stream?id=dQw4w9WgXcQ
```
