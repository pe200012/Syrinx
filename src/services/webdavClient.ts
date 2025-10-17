import { createClient, FileStat, WebDAVClient } from "webdav";
import type { Track, WebDavConnection } from "../types";

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

        const entries = Array.isArray(results) ? results : [results];

        return entries.filter(isAudioFile).map((entry) => mapToTrack(entry, root));
    }

    async getStreamUrl(trackPath: string): Promise<string> {
        const normalized = normalizePath(trackPath);
        return this.client.getFileDownloadLink(normalized);
    }

    async probeCoverArt(trackPath: string): Promise<string | null> {
        const directory = normalizePath(trackPath).split("/").slice(0, -1).join("/") || "/";
        const candidatePaths = [
            `${directory}/cover.jpg`,
            `${directory}/cover.png`,
            `${directory}/folder.jpg`,
            `${directory}/folder.png`
        ];

        for (const candidate of candidatePaths) {
            try {
                const stat = await this.client.stat(candidate);
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
