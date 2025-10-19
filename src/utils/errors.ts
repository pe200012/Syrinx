import type { ConnectionConfig } from "../types";

interface HttpLikeError {
    status?: number;
    statusCode?: number;
    response?: {
        status?: number;
        statusText?: string;
    };
}

function extractStatus(error: unknown): number | undefined {
    if (!error || typeof error !== "object") {
        return undefined;
    }
    const httpError = error as HttpLikeError;
    return httpError.status ?? httpError.statusCode ?? httpError.response?.status;
}

interface ExplainConnectionErrorOptions {
    currentProtocol?: string | null;
}

export function explainConnectionError(
    error: unknown,
    config: ConnectionConfig,
    options?: ExplainConnectionErrorOptions
): string {
    if (!config.baseUrl.trim()) {
        return "Enter the WebDAV server URL before connecting.";
    }

    let parsedUrl: URL | null = null;
    try {
        parsedUrl = new URL(config.baseUrl);
    } catch {
        return "The WebDAV server URL must include the protocol, e.g. https://example.com/webdav.";
    }

    const currentProtocol = options?.currentProtocol ?? (typeof window !== "undefined" ? window.location.protocol : null);
    if (currentProtocol === "https:" && parsedUrl.protocol === "http:") {
        return "Browsers block loading an HTTP WebDAV server from an HTTPS page. Serve the WebDAV endpoint over HTTPS or develop on http://localhost.";
    }

    const message = error instanceof Error ? error.message : "";
    const status = extractStatus(error);

    if (status === 401 || status === 403) {
        return "Authentication to the WebDAV server was rejected. Check the username/password and whether the account has access.";
    }

    if (status === 404) {
        return "The WebDAV path was not found. Confirm the root path exists on the server.";
    }

    if (status && status >= 500) {
        return "The WebDAV server returned an error. Try again later or check server logs.";
    }

    if (message) {
        if (/NetworkError|Failed to fetch/i.test(message)) {
            return "The browser could not reach the WebDAV server. Most often this means the server is blocking cross-origin (CORS) requests. Allow this origin in the server's CORS policy or tunnel the connection through a reverse proxy. Original error: " + message;
        }

        if (/SSL|certificate|self-signed/i.test(message)) {
            return "TLS negotiation with the WebDAV server failed. Verify the certificate is trusted by the browser.";
        }
    }

    return message || "Failed to connect to the WebDAV server. Check the URL and network connection.";
}