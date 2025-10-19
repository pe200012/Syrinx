# WebDAV Music Player

A modern web-based music player built with React, Vite, and TypeScript that streams audio directly from any WebDAV-compatible server. Enter your server details, browse your music library, and enjoy playback with shuffle, repeat, and cover art detection.

## Features

- 🔑 Connect to any WebDAV endpoint with optional credentials
- 📂 Recursively scan folders and filter your library in real time
- 🎧 Stream audio formats including MP3, FLAC, AAC, OGG, WAV, OPUS, and more
- 🔁 Shuffle, repeat-all, and repeat-one playback modes
- 🖼️ Automatic album art detection (`cover.jpg`, `folder.png`, etc.)
- 💾 Optionally remember server settings (excluding passwords) in local storage
- 🧪 Unit tests for core utilities powered by Vitest & Testing Library

## Quick start

```fish
# Install dependencies
npm install

# Start the development server
npm run dev

# Run the unit tests
npm run test

# Build for production
npm run build
npm run preview
```

Open the development server URL (default http://localhost:5173) in your browser.

## Usage

1. Provide your WebDAV server URL (e.g., `https://example.com/webdav`).
2. Optionally enter username/password if required by the server.
3. Configure the root path (defaults to `/`) and whether to scan subfolders.
4. Click **Connect** to fetch your library.
5. Select any track to start playback. Use the controls to shuffle, repeat, seek, or adjust volume.

> **Note:** The app relies on your WebDAV server allowing cross-origin requests (CORS). If you encounter network errors, ensure the server includes the appropriate CORS headers for your deployment origin.

## Project structure

```
webdav-music-player/
├── index.html
├── package.json
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   ├── services/
│   ├── types.ts
│   ├── utils/
│   └── styles.css
├── tsconfig.json
├── vite.config.ts
└── vitest.setup.ts
```

## Configuration notes

- Passwords are never persisted to local storage. Only the server URL, username, root path, and recursion preference are saved when "remember" is enabled.
- The player uses the [`webdav`](https://www.npmjs.com/package/webdav) client under the hood, which works in modern browsers via fetch/XHR.
- Album art support is best-effort by probing common file names located alongside the track.

## Browser compatibility

Tested with current versions of Chrome, Firefox, Safari, and Edge. Autoplay policies may require the first play action to be user-initiated (click/tap the Play button).

## Troubleshooting connectivity

If the connection fails, the UI now surfaces a detailed hint alongside the original error message. Common issues include:

- **CORS blocked** – The browser reports `NetworkError when attempting to fetch resource`. Configure your WebDAV server to send `Access-Control-Allow-Origin` for the app's origin (e.g., `http://localhost:5173`) and include `Authorization` in `Access-Control-Allow-Headers` if you use credentials.
- **Mixed content** – When the app is served over HTTPS, the WebDAV URL must also use HTTPS. Browsers block HTTPS pages from loading insecure HTTP resources.
- **Authentication rejected** – A 401/403 response means the credentials or permissions are incorrect for the requested path.
- **Missing path** – A 404 indicates the root path does not exist. Double-check the folder path configured on the server.

During local development the Vite dev server already runs on `http://localhost`, so mixed-content rules do not apply. When deploying the app over HTTPS, ensure the WebDAV endpoint is also exposed via HTTPS or tunnel the traffic through a reverse proxy that shares the same origin as the web app.

## License

This project is distributed under the MIT License. See [LICENSE](LICENSE) for details.
