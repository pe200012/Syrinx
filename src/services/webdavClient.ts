import { createClient, FileStat, WebDAVClient } from "webdav";
import { parseBlob } from "music-metadata-browser";
import type { Track, TrackMetadata, WebDavConnection } from "../types";

const AUDIO_EXTENSIONS = new Set([
    ".mp3",
    ".flac",
    ".m4a",
    ".aac",
    ".wav",
    ".ogg",
    ".oga",
    ".opus",
    ".weba",
    ".alac"
]);

export interface ListTracksOptions {
    recursive?: boolean;
    rootPath?: string;
}

function normalizePath(path: string): string {
    if (!path) return "/";
    const trimmed = path.trim();
    if (!trimmed || trimmed === "/") {
        return "/";
    }
    const sanitized = trimmed.replace(/\\/g, "/");
    return sanitized.startsWith("/") ? sanitized : `/${sanitized}`;
}

function isAudioFile(entry: FileStat): boolean {
    if (entry.type !== "file") {
        return false;
    }
    const lower = entry.basename.toLowerCase();
    const matchingExtension = Array.from(AUDIO_EXTENSIONS).find((ext) =>
        lower.endsWith(ext)
    );
    if (matchingExtension) {
        return true;
    }
    if (entry.mime) {
        return entry.mime.startsWith("audio/");
    }
    return false;
}

function mapToTrack(entry: FileStat, rootPath: string): Track {
    const displayPath = entry.filename.startsWith(rootPath)
        ? entry.filename.slice(rootPath.length).replace(/^\/+/, "")
        : entry.filename.replace(/^\/+/, "");

    return {
        id: entry.etag ?? entry.filename,
        name: entry.basename,
        path: entry.filename,
        size: typeof entry.size === "number" ? entry.size : undefined,
        contentType: entry.mime,
        lastModified: entry.lastmod ?? undefined,
        displayPath: displayPath || entry.basename
    };
}

export class WebDavAudioClient {
    private client: WebDAVClient;
    private readonly basePath: string;
    private readonly metadataCache = new Map<string, TrackMetadata | null>();

    constructor(private readonly connection: WebDavConnection, rootPath = "/") {
        this.basePath = normalizePath(rootPath);
        this.client = createClient(connection.baseUrl, {
            username: connection.username,
            password: connection.password,
            maxBodyLength: Infinity
        });
    }

    async listTracks(options: ListTracksOptions = {}): Promise<Track[]> {
        const root = normalizePath(options.rootPath ?? this.basePath);
        const deep = Boolean(options.recursive);

        const results = await this.client.getDirectoryContents(root, {
            deep
        });

        const entries = (Array.isArray(results) ? results : [results]) as FileStat[];

        return entries.filter(isAudioFile).map((entry) => mapToTrack(entry, root));
    }

    async getStreamUrl(trackPath: string): Promise<string> {
        const normalized = normalizePath(trackPath);
        return this.client.getFileDownloadLink(normalized);
    }

    async probeCoverArt(trackPath: string): Promise<string | null> {
        const directory = normalizePath(trackPath).split("/").slice(0, -1).join("/") || "/";
        const candidatePaths = [
            `${directory}/folder.jpg`,
            `${directory}/folder.png`,
            `${directory}/cover.jpg`,
            `${directory}/cover.png`,
        ];

        for (const candidate of candidatePaths) {
            try {
                const stat = (await this.client.stat(candidate)) as FileStat;
                if (stat.type === "file") {
                    return this.client.getFileDownloadLink(candidate);
                }
            } catch (error) {
                // Ignore missing files
                continue;
            }
        }

        return null;
    }

    async inferMetadata(trackPath: string): Promise<TrackMetadata | null> {
        const normalized = normalizePath(trackPath);
        const pathParts = normalized.split("/");

        // Get filename without extension
        const filename = pathParts[pathParts.length - 1];
        const extensionIndex = filename.lastIndexOf(".");
        const nameWithoutExt = extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;

        // Extract track number and title from filename (e.g., "01. xxx")
        const trackMatch = nameWithoutExt.match(/^(\d+)\.\s*(.+)$/);
        const title = trackMatch ? trackMatch[2].trim() : nameWithoutExt;
        const trackNumber = trackMatch ? parseInt(trackMatch[1], 10) : undefined;

        let artist: string | undefined;
        let album: string | undefined;

        // Try to extract artist and album from parent directories
        for (let i = pathParts.length - 2; i >= 0; i--) {
            const part = pathParts[i];

            // Extract artist from [artist] format
            const artistMatch = part.match(/^\[([^\]]+)\]$/);
            if (artistMatch && !artist) {
                artist = artistMatch[1].trim();
                continue;
            }

            // Extract album from date + catalog + album format
            const albumMatch = part.match(/^\d{4}\.\d{2}\.\d{2}\s+(?:\[[^\]]+\]\s+)?(.+)$/);
            if (albumMatch && !album) {
                album = albumMatch[1].trim();
                continue;
            }

            // If we haven't found album yet, use as-is
            if (!album && part && !part.match(/^\[.*\]$/)) {
                album = part.trim();
            }
        }

        const result: TrackMetadata = {
            title: title || undefined,
            artist: artist || undefined,
            album: album || undefined,
            trackNumber: trackNumber
        };

        const hasInformation = Boolean(result.title || result.artist || result.album);
        return hasInformation ? result : null;
    }

    async fetchMetadata(trackPath: string): Promise<TrackMetadata | null> {
        const normalized = normalizePath(trackPath);
        if (this.metadataCache.has(normalized)) {
            return this.metadataCache.get(normalized) ?? null;
        }

        try {
            const url = await this.getStreamUrl(normalized);

            let response: Response | null = null;
            try {
                response = await fetch(url, {
                    headers: {
                        Range: "bytes=0-131071"
                    },
                    credentials: "include"
                });
            } catch (networkError) {
                console.warn("Failed to fetch metadata payload", networkError);
                this.metadataCache.set(normalized, null);
                return null;
            }

            if (!response || !response.ok || response.status === 416 || response.status === 400) {
                this.metadataCache.set(normalized, null);
                return null;
            }
            const blob = await response.blob();
            const metadata = await parseBlob(blob);
            const { common } = metadata;

            const result: TrackMetadata = {
                title: common.title ?? undefined,
                artist: common.artist ?? undefined,
                album: common.album ?? undefined,
                trackNumber: common.track?.no ?? undefined
            };

            const hasInformation = Boolean(result.title || result.artist || result.album);
            const payload = hasInformation ? result : null;
            this.metadataCache.set(normalized, payload);
            return payload;
        } catch (error) {
            console.warn("Failed to parse metadata", error);
            this.metadataCache.set(normalized, null);
            return null;
        }
    }
}

export function humanFileSize(bytes?: number): string {
    if (bytes === undefined) return "";
    if (bytes === 0) return "0 B";
    const thresh = 1024;
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let u = 0;
    while (size >= thresh && u < units.length - 1) {
        size /= thresh;
        u += 1;
    }
    const digits = size < 10 && u > 0 && !Number.isInteger(size) ? 1 : 0;
    return `${size.toFixed(digits)} ${units[u]}`;
}

export { AUDIO_EXTENSIONS };
