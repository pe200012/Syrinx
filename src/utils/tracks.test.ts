import { describe, expect, it } from "vitest";
import type { Track } from "../types";
import { filterTracks, sortTracks } from "./tracks";
import type { TrackSortOptions } from "./tracks";

const sampleTracks: Track[] = [
    {
        id: "1",
        name: "Song B",
        path: "/music/song-b.mp3",
        displayPath: "song-b.mp3",
        size: 2048,
        metadata: {
            title: "Sunrise",
            artist: "Aurora",
            album: "Morning Light"
        }
    },
    {
        id: "2",
        name: "Song A",
        path: "/music/album/song-a.flac",
        displayPath: "album/song-a.flac",
        size: 4096,
        metadata: {
            title: "Dusk",
            artist: "Aurora",
            album: "Evening Glow"
        }
    },
    {
        id: "3",
        name: "Podcast Episode",
        path: "/podcasts/episode.mp3",
        displayPath: "podcasts/episode.mp3",
        metadata: {
            title: "Episode 12",
            artist: "Science Talks"
        }
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

    it("filters tracks by metadata", () => {
        const result = filterTracks(sampleTracks, "evening");
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("2");
    });
});

describe("sortTracks", () => {
    const expectOrder = (options?: Partial<TrackSortOptions>) =>
        sortTracks(sampleTracks, { key: "title", direction: "asc", ...options }).map(
            (track) => track.id
        );

    it("sorts tracks by title by default", () => {
        expect(expectOrder()).toEqual(["2", "3", "1"]);
    });

    it("sorts tracks by artist", () => {
        const order = expectOrder({ key: "artist" });
        expect(order).toEqual(["2", "1", "3"]);
    });

    it("supports descending order", () => {
        const order = expectOrder({ key: "album", direction: "desc" });
        expect(order).toEqual(["1", "2", "3"]);
    });
});
