import type { Track } from "../types";

export type TrackSortKey = "title" | "artist" | "album" | "name";
export type TrackSortDirection = "asc" | "desc";

export interface TrackSortOptions {
    key: TrackSortKey;
    direction: TrackSortDirection;
}

export function filterTracks(tracks: Track[], term: string): Track[] {
    if (!term.trim()) {
        return [...tracks];
    }
    const lower = term.toLowerCase();
    return tracks.filter((track) => {
        const haystack = [
            track.metadata?.title,
            track.metadata?.artist,
            track.metadata?.album,
            track.name,
            track.displayPath
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        return haystack.includes(lower);
    });
}

function getSortableValue(track: Track, key: TrackSortKey): string {
    switch (key) {
        case "artist":
            return track.metadata?.artist ?? "";
        case "album":
            return track.metadata?.album ?? "";
        case "title":
            return track.metadata?.title ?? track.name ?? "";
        default:
            return track.name ?? "";
    }
}

export function sortTracks(
    tracks: Track[],
    options: TrackSortOptions = { key: "title", direction: "asc" }
): Track[] {
    const { key, direction } = options;
    const multiplier = direction === "asc" ? 1 : -1;
    return [...tracks].sort((a, b) => {
        const valueA = getSortableValue(a, key);
        const valueB = getSortableValue(b, key);
        const primary = valueA.localeCompare(valueB, undefined, { sensitivity: "base" });
        if (primary !== 0) {
            return primary * multiplier;
        }
        const fallback = a.displayPath.localeCompare(b.displayPath, undefined, {
            sensitivity: "base"
        });
        if (fallback !== 0) {
            return fallback * multiplier;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * multiplier;
    });
}
