# WebDAV Music Player

A modern web-based music player built with React, Vite, and TypeScript that streams audio directly from any WebDAV-compatible server. Enter your server details, browse your music library, and enjoy playback with shuffle, repeat, and cover art detection.

## Troubleshooting connectivity

If the connection fails, the UI now surfaces a detailed hint alongside the original error message. Common issues include:

- **CORS blocked** – The browser reports `NetworkError when attempting to fetch resource`. Configure your WebDAV server to send `Access-Control-Allow-Origin` for the app's origin (e.g., `http://localhost:5173`) and include `Authorization` in `Access-Control-Allow-Headers` if you use credentials.
- **Mixed content** – When the app is served over HTTPS, the WebDAV URL must also use HTTPS. Browsers block HTTPS pages from loading insecure HTTP resources.
- **Authentication rejected** – A 401/403 response means the credentials or permissions are incorrect for the requested path.
- **Missing path** – A 404 indicates the root path does not exist. Double-check the folder path configured on the server.

During local development the Vite dev server already runs on `http://localhost`, so mixed-content rules do not apply. When deploying the app over HTTPS, ensure the WebDAV endpoint is also exposed via HTTPS or tunnel the traffic through a reverse proxy that shares the same origin as the web app.

## License

This project is distributed under the MIT License. See [LICENSE](LICENSE) for details.
