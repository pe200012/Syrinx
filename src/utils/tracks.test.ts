import { describe, expect, it } from "vitest";
import type { Track } from "../types";
import { filterTracks, sortTracks } from "./tracks";

const sampleTracks: Track[] = [
    {
        id: "1",
        name: "Song B",
        path: "/music/song-b.mp3",
        displayPath: "song-b.mp3",
        size: 2048
    },
    {
        id: "2",
        name: "Song A",
        path: "/music/album/song-a.flac",
        displayPath: "album/song-a.flac",
        size: 4096
    },
    {
        id: "3",
        name: "Podcast Episode",
        path: "/podcasts/episode.mp3",
        displayPath: "podcasts/episode.mp3"
    }
];

describe("filterTracks", () => {
    it("returns all tracks when search is empty", () => {
        expect(filterTracks(sampleTracks, "")).toHaveLength(3);
    });

    it("filters tracks by name", () => {
        const result = filterTracks(sampleTracks, "song");
        expect(result.map((track) => track.id)).toEqual(["1", "2"]);
    });

    it("filters tracks by display path", () => {
        const result = filterTracks(sampleTracks, "podcasts");
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("3");
    });
});

describe("sortTracks", () => {
    it("sorts tracks alphabetically by display path then name", () => {
        const result = sortTracks(sampleTracks);
        expect(result.map((track) => track.id)).toEqual(["2", "3", "1"]);
    });
});
