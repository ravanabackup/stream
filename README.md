# StreamCast — Real-Time Audio & Video Broadcasting via URL

A serverless, real-time audio and video broadcast webpage built with **React**, **WebRTC (PeerJS)**, and **Tailwind CSS**, designed specifically to be hosted directly on **GitHub Pages** (or any static hosting provider) with **zero backend servers**.

Broadcast your PC's screen, camera, microphone, or system audio to any phone, tablet, smart TV, or another browser with ultra-low latency (<150ms).

---

## 🚀 Key Features

- **Direct URL & QR Code Pairing**:
  - Share the generated URL or scan the high-contrast QR code directly off your PC monitor with your smartphone camera.
  - No app installation required on the receiver device — opens instantly in Safari (iOS), Chrome (Android/PC), Firefox, or Edge.
- **Multiple PC Broadcast Sources**:
  - **Screen Share**: Share entire screen, application window, or browser tab with optional system audio.
  - **Webcam**: High-definition camera stream with microphone.
  - **Virtual Test Pattern**: Built-in SMPTE color bar generator with live clock and 1Hz audio beep for testing without camera permissions.
- **Real-Time Telemetry & Audio Visualizer**:
  - Live animated frequency bars & decibel meter via Web Audio API.
  - Real-time RTT latency, resolution, and viewer counter.
- **Two-Way Intercom (Viewer Talkback)**:
  - Phone viewers can use Push-to-Talk to speak back to the PC broadcaster.
- **Audio Boost & Mobile Autoplay Policy Handler**:
  - Unlocks audio seamlessly with a 1-tap banner.
  - 200% Volume Boost node for quiet PC laptop mics.
- **Screen WakeLock**:
  - Keeps phone screens awake while watching.
- **Local Recording & Snapshot**:
  - Record broadcast to `.webm` / `.mp4` file or capture high-res frame snapshots.
- **GitHub Pages Ready**:
  - Compiles into a single portable static bundle via `vite-plugin-singlefile`.
  - Works with query parameters (`?room=xyz`) and hash routing (`#room=xyz`).

---

## 🌐 Deploy to GitHub Pages (3 Steps)

1. **Push this repository to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial StreamCast commit"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Add GitHub Actions Deploy Workflow**:
   Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: ['main']
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   concurrency:
     group: 'pages'
     cancel-in-progress: true

   jobs:
     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: 'npm'
         - run: npm ci
         - run: npm run build
         - uses: actions/configure-pages@v4
         - uses: actions/upload-pages-artifact@v3
           with:
             path: './dist'
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

3. **Enable GitHub Pages in Repository Settings**:
   - Navigate to **Settings** &rarr; **Pages**.
   - Under **Build and deployment**, select **Source: GitHub Actions**.
   - Once the action finishes, your broadcast site is live at:
     `https://<your-username>.github.io/<your-repo-name>/`
