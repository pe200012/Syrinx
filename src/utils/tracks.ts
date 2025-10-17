import type { Track } from "../types";

export function filterTracks(tracks: Track[], term: string): Track[] {
    if (!term.trim()) {
        return [...tracks];
    }
    const lower = term.toLowerCase();
    return tracks.filter((track) => {
        const haystack = [track.name, track.displayPath].join(" ").toLowerCase();
        return haystack.includes(lower);
    });
}

export function sortTracks(tracks: Track[]): Track[] {
    return [...tracks].sort((a, b) => {
        const pathCompare = a.displayPath.localeCompare(b.displayPath, undefined, {
            sensitivity: "base"
        });
        if (pathCompare !== 0) return pathCompare;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
}
