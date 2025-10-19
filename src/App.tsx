import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConnectionCard from "./components/ConnectionCard";
import LoginForm from "./components/LoginForm";
import NowPlaying from "./components/NowPlaying";
import PlaylistList from "./components/PlaylistList";
import PlayerControls, { type RepeatMode } from "./components/PlayerControls";
import TrackList from "./components/TrackList";
import type { ConnectionConfig, Track, TrackMetadata } from "./types";
import { WebDavAudioClient } from "./services/webdavClient";
import {
    filterTracks,
    sortTracks,
    type TrackSortKey,
    type TrackSortOptions
} from "./utils/tracks";
import { explainConnectionError } from "./utils/errors";

const STORAGE_KEY = "webdav-music-player:connection";

function loadStoredConfig(): ConnectionConfig | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as Partial<ConnectionConfig>;
        return {
            baseUrl: parsed.baseUrl ?? "",
            username: parsed.username ?? "",
            password: "",
            rootPath: parsed.rootPath ?? "/",
            recursive: Boolean(parsed.recursive),
            remember: true
        };
    } catch (error) {
        console.error("Failed to parse stored configuration", error);
        return null;
    }
}

function persistConfig(config: ConnectionConfig | null): ConnectionConfig | null {
    if (typeof window === "undefined") return null;
    if (!config || !config.remember) {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
    }

    const payload = {
        baseUrl: config.baseUrl,
        username: config.username,
        rootPath: config.rootPath,
        recursive: config.recursive
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    return {
        ...config,
        password: "",
        remember: true
    };
}

function derivePlaylistGrouping(track: Track): { key: string; label: string } {
    const album = track.metadata?.album?.trim();
    if (album) {
        return { key: `album::${album.toLowerCase()}`, label: album };
    }

    const path = track.displayPath || track.name;
    const parts = path.split("/").filter(Boolean);
    const segment = parts.length > 1 ? parts[0] : "Loose tracks";
    const label = segment.trim() || "Loose tracks";

    return { key: `folder::${label.toLowerCase()}`, label };
}

export default function App() {
    const audioRef = useRef<HTMLAudioElement>(null);

    const [storedConfig, setStoredConfig] = useState<ConnectionConfig | null>(() =>
        loadStoredConfig()
    );
    const [client, setClient] = useState<WebDavAudioClient | null>(null);
    const [connection, setConnection] = useState<ConnectionConfig | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [filter, setFilter] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isTrackLoading, setIsTrackLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [shuffle, setShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
    const [coverArtUrl, setCoverArtUrl] = useState<string | null>(null);
    const [sortOptions, setSortOptions] = useState<TrackSortOptions>({ key: "title", direction: "asc" });
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("all");
    const tracksRef = useRef<Track[]>(tracks);
    const pendingMetadataRef = useRef<Set<string>>(new Set());
    const metadataWorkerAbortRef = useRef<{ cancelled: boolean } | null>(null);
    const metadataWorkerRunningRef = useRef(false);

    interface PlaylistInfo {
        id: string;
        label: string;
        trackIds: string[];
        count: number;
    }

    const playlists: PlaylistInfo[] = useMemo(() => {
        if (tracks.length === 0) {
            return [
                {
                    id: "all",
                    label: "All tracks",
                    trackIds: [],
                    count: 0
                }
            ];
        }

        const groups = new Map<string, { label: string; trackIds: string[] }>();
        tracks.forEach((track) => {
            const { key, label } = derivePlaylistGrouping(track);
            if (!groups.has(key)) {
                groups.set(key, { label, trackIds: [] });
            }
            groups.get(key)!.trackIds.push(track.id);
        });

        const groupEntries = Array.from(groups.entries())
            .map(([key, value]) => ({
                id: key,
                label: value.label,
                trackIds: value.trackIds,
                count: value.trackIds.length
            }))
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

        return [
            {
                id: "all",
                label: "All tracks",
                trackIds: tracks.map((track) => track.id),
                count: tracks.length
            },
            ...groupEntries
        ];
    }, [tracks]);

    useEffect(() => {
        if (playlists.length === 0) {
            return;
        }
        if (!playlists.some((playlist) => playlist.id === selectedPlaylistId)) {
            setSelectedPlaylistId(playlists[0].id);
        }
    }, [playlists, selectedPlaylistId]);

    const playlistFilteredTracks = useMemo(() => {
        if (selectedPlaylistId === "all") {
            return tracks;
        }
        const playlist = playlists.find((candidate) => candidate.id === selectedPlaylistId);
        if (!playlist) {
            return tracks;
        }
        const trackSet = new Set(playlist.trackIds);
        return tracks.filter((track) => trackSet.has(track.id));
    }, [tracks, playlists, selectedPlaylistId]);

    const filteredTracks = useMemo(
        () => filterTracks(playlistFilteredTracks, filter),
        [playlistFilteredTracks, filter]
    );

    const visibleTracks = useMemo(
        () => sortTracks(filteredTracks, sortOptions),
        [filteredTracks, sortOptions]
    );

    const playlistSummaries = useMemo(
        () => playlists.map((playlist) => ({ id: playlist.id, label: playlist.label, count: playlist.count })),
        [playlists]
    );

    const selectedPlaylist = useMemo(
        () => playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? playlists[0],
        [playlists, selectedPlaylistId]
    );

    const currentTrack = useMemo(() => {
        if (!currentTrackId) {
            return visibleTracks[0] ?? null;
        }
        return (
            visibleTracks.find((track: Track) => track.id === currentTrackId) ??
            tracks.find((track: Track) => track.id === currentTrackId) ??
            visibleTracks[0] ??
            null
        );
    }, [currentTrackId, visibleTracks, tracks]);

    useEffect(() => {
        if (visibleTracks.length === 0) {
            setCurrentTrackId(null);
            return;
        }
        setCurrentTrackId((prev) => {
            if (prev && visibleTracks.some((track) => track.id === prev)) {
                return prev;
            }
            return visibleTracks[0].id;
        });
    }, [visibleTracks]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const disconnect = useCallback(() => {
        setClient(null);
        setConnection(null);
        setTracks([]);
        setCurrentTrackId(null);
        setCoverArtUrl(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setSelectedPlaylistId("all");
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
        }
    }, []);

    const connect = useCallback(
        async (config: ConnectionConfig) => {
            setIsLoading(true);
            setError(null);
            try {
                const clientInstance = new WebDavAudioClient(config, config.rootPath);
                const fetched = await clientInstance.listTracks({
                    recursive: config.recursive,
                    rootPath: config.rootPath
                });
                const sorted = sortTracks(fetched, sortOptions);
                setClient(clientInstance);
                setConnection(config);
                setTracks(sorted);
                setCurrentTrackId(sorted[0]?.id ?? null);
                setFilter("");
                setSelectedPlaylistId("all");
                const stored = config.remember ? persistConfig(config) : persistConfig(null);
                setStoredConfig(stored);
            } catch (err) {
                console.error(err);
                setClient(null);
                setConnection(null);
                setTracks([]);
                setCurrentTrackId(null);
                const friendly = explainConnectionError(err, config);
                setError(friendly);
            } finally {
                setIsLoading(false);
            }
        },
        [sortOptions]
    );

    const refreshTracks = useCallback(async () => {
        if (!client || !connection) return;
        setIsLoading(true);
        try {
            const fetched = await client.listTracks({
                recursive: connection.recursive,
                rootPath: connection.rootPath
            });
            const sorted = sortTracks(fetched, sortOptions);
            setTracks(sorted);
            setCurrentTrackId((prev: string | null) => {
                if (!prev || !sorted.some((track: Track) => track.id === prev)) {
                    return sorted[0]?.id ?? null;
                }
                return prev;
            });
        } catch (err) {
            console.error(err);
            setError(connection ? explainConnectionError(err, connection) : "Failed to refresh tracks.");
        } finally {
            setIsLoading(false);
        }
    }, [client, connection, sortOptions]);

    const applyMetadataUpdates = useCallback(
        (entries: Array<{ id: string; metadata: TrackMetadata | null }>) => {
            if (entries.length === 0) {
                return;
            }

            setTracks((prev: Track[]) => {
                const updates = new Map(entries.map(({ id, metadata }) => [id, metadata]));
                let mutated = false;
                const updated = prev.map((track) => {
                    if (!updates.has(track.id)) {
                        return track;
                    }
                    mutated = true;
                    return {
                        ...track,
                        metadata: updates.get(track.id) ?? null
                    };
                });

                return mutated ? sortTracks(updated, sortOptions) : prev;
            });
        },
        [sortOptions]
    );

    const startMetadataWorker = useCallback(() => {
        if (!client) return;
        if (metadataWorkerRunningRef.current) return;
        if (pendingMetadataRef.current.size === 0) return;

        const controller = { cancelled: false };
        metadataWorkerAbortRef.current = controller;
        metadataWorkerRunningRef.current = true;

        const processQueue = async () => {
            const BATCH_SIZE = 16;

            while (!controller.cancelled) {
                const ids = Array.from(pendingMetadataRef.current).slice(0, BATCH_SIZE);
                if (ids.length === 0) {
                    break;
                }

                const results = await Promise.all(
                    ids.map(async (id) => {
                        const track = tracksRef.current.find((candidate) => candidate.id === id);
                        if (!track) {
                            return null;
                        }
                        try {
                            const metadata = await client.inferMetadata(track.path);
                            return { id, metadata };
                        } catch (metadataError) {
                            console.warn("Failed to read metadata", metadataError);
                            return { id, metadata: null };
                        }
                    })
                );

                ids.forEach((id) => {
                    pendingMetadataRef.current.delete(id);
                });

                if (!controller.cancelled) {
                    const entries = results
                        .filter((entry): entry is { id: string; metadata: TrackMetadata | null } => entry !== null)
                        .map(({ id, metadata }) => ({ id, metadata }));
                    if (entries.length > 0) {
                        applyMetadataUpdates(entries);
                    }
                }
            }

            metadataWorkerRunningRef.current = false;
            metadataWorkerAbortRef.current = null;
        };

        void processQueue();
    }, [client, applyMetadataUpdates]);

    useEffect(() => {
        tracksRef.current = tracks;
    }, [tracks]);

    useEffect(() => {
        if (metadataWorkerAbortRef.current) {
            metadataWorkerAbortRef.current.cancelled = true;
            metadataWorkerAbortRef.current = null;
        }
        metadataWorkerRunningRef.current = false;
        pendingMetadataRef.current.clear();
    }, [client]);

    useEffect(() => {
        return () => {
            if (metadataWorkerAbortRef.current) {
                metadataWorkerAbortRef.current.cancelled = true;
            }
            metadataWorkerRunningRef.current = false;
            pendingMetadataRef.current.clear();
        };
    }, []);

    useEffect(() => {
        if (!client) return;
        const pending = visibleTracks.filter((track) => track.metadata === undefined);
        if (pending.length === 0) {
            return;
        }

        pending.forEach((track) => {
            pendingMetadataRef.current.add(track.id);
        });

        applyMetadataUpdates(
            pending.map((track) => ({
                id: track.id,
                metadata: null
            }))
        );

        startMetadataWorker();
    }, [client, visibleTracks, applyMetadataUpdates, startMetadataWorker]);

    const advanceToNextTrack = useCallback(
        (auto = false) => {
            if (!visibleTracks.length) return;
            const current = currentTrack ?? visibleTracks[0];
            const currentIndex = visibleTracks.findIndex(
                (track: Track) => track.id === current.id
            );

            if (shuffle && visibleTracks.length > 1) {
                let nextIndex = currentIndex;
                while (nextIndex === currentIndex) {
                    nextIndex = Math.floor(Math.random() * visibleTracks.length);
                }
                setCurrentTrackId(visibleTracks[nextIndex].id);
                return;
            }

            if (auto && repeatMode === "one") {
                const audio = audioRef.current;
                if (audio) {
                    audio.currentTime = 0;
                    void audio.play().catch(() => {
                        /* ignore autoplay errors */
                    });
                }
                return;
            }

            let nextIndex = currentIndex + 1;
            if (nextIndex >= visibleTracks.length) {
                if (auto) {
                    if (repeatMode === "all") {
                        nextIndex = 0;
                    } else {
                        const audio = audioRef.current;
                        if (audio) {
                            audio.pause();
                            audio.currentTime = 0;
                        }
                        setIsPlaying(false);
                        return;
                    }
                } else {
                    if (repeatMode === "all") {
                        nextIndex = 0;
                    } else {
                        return;
                    }
                }
            }

            const nextTrack = visibleTracks[nextIndex];
            if (nextTrack) {
                setCurrentTrackId(nextTrack.id);
            }
        },
        [visibleTracks, currentTrack, shuffle, repeatMode]
    );

    const handlePrevious = useCallback(() => {
        if (!visibleTracks.length) return;
        const audio = audioRef.current;
        if (audio && audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        const current = currentTrack ?? visibleTracks[0];
        const currentIndex = visibleTracks.findIndex(
            (track: Track) => track.id === current.id
        );
        let previousIndex = currentIndex - 1;
        if (previousIndex < 0) {
            previousIndex = repeatMode === "all" ? visibleTracks.length - 1 : 0;
        }
        const previousTrack = visibleTracks[previousIndex];
        if (previousTrack) {
            setCurrentTrackId(previousTrack.id);
        }
    }, [visibleTracks, currentTrack, repeatMode]);

    const handleNext = useCallback(() => {
        advanceToNextTrack(false);
    }, [advanceToNextTrack]);

    const handleSelectTrack = useCallback((track: Track) => {
        setCurrentTrackId(track.id);
    }, []);

    const handlePlayPause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            void audio.play().catch(() => {
                /* ignore autoplay errors */
            });
        } else {
            audio.pause();
        }
    }, []);

    const handleSeek = useCallback((time: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = time;
    }, []);

    const handleVolumeChange = useCallback((value: number) => {
        setVolume(value);
        if (audioRef.current) {
            audioRef.current.volume = value;
        }
    }, []);

    const handleToggleShuffle = useCallback(() => {
        setShuffle((prev: boolean) => !prev);
    }, []);

    const handleCycleRepeat = useCallback(() => {
        setRepeatMode((prev: RepeatMode) => {
            switch (prev) {
                case "off":
                    return "all";
                case "all":
                    return "one";
                default:
                    return "off";
            }
        });
    }, []);

    const handleSortChange = useCallback((key: TrackSortKey) => {
        setSortOptions((prev) => {
            if (prev.key === key) {
                return {
                    key,
                    direction: prev.direction === "asc" ? "desc" : "asc"
                };
            }
            return { key, direction: "asc" };
        });
    }, []);

    const handleSelectPlaylist = useCallback((playlistId: string) => {
        setSelectedPlaylistId(playlistId);
        setFilter("");
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onDurationChange = () => {
            setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
        };
        const onEnded = () => {
            setIsPlaying(false);
            advanceToNextTrack(true);
        };

        audio.addEventListener("play", onPlay);
        audio.addEventListener("pause", onPause);
        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("durationchange", onDurationChange);
        audio.addEventListener("loadedmetadata", onDurationChange);
        audio.addEventListener("ended", onEnded);

        return () => {
            audio.removeEventListener("play", onPlay);
            audio.removeEventListener("pause", onPause);
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("durationchange", onDurationChange);
            audio.removeEventListener("loadedmetadata", onDurationChange);
            audio.removeEventListener("ended", onEnded);
        };
    }, [advanceToNextTrack]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!client || !currentTrack || !audio) {
            setCoverArtUrl(null);
            return;
        }

        let isCancelled = false;
        setIsTrackLoading(true);
        setError(null);
        setCurrentTime(0);
        setDuration(0);

        const loadTrack = async () => {
            try {
                const streamUrl = await client.getStreamUrl(currentTrack.path);
                if (isCancelled) return;
                audio.pause();
                audio.src = streamUrl;
                audio.load();
                audio.volume = volume;
                const playPromise = audio.play();
                if (playPromise) {
                    await playPromise.catch(() => {
                        /* autoplay may be blocked */
                    });
                }
            } catch (err) {
                if (!isCancelled) {
                    setError(err instanceof Error ? err.message : "Failed to load track.");
                }
            } finally {
                if (!isCancelled) {
                    setIsTrackLoading(false);
                }
            }
        };

        const loadCover = async () => {
            try {
                const artUrl = await client.probeCoverArt(currentTrack.path);
                if (!isCancelled) {
                    setCoverArtUrl(artUrl);
                }
            } catch {
                if (!isCancelled) {
                    setCoverArtUrl(null);
                }
            }
        };

        void loadTrack();
        void loadCover();

        return () => {
            isCancelled = true;
        };
    }, [client, currentTrack, volume]);

    const connected = client !== null && connection !== null;

    return (
        <div className="app">
            <main className={`app__layout ${connected ? "app__layout--connected" : "app__layout--auth"}`}>
                {connected ? (
                    <>
                        <div className="app__hero">
                            <NowPlaying
                                track={currentTrack ?? null}
                                coverArtUrl={coverArtUrl}
                                isPlaying={isPlaying}
                            >
                                <PlayerControls
                                    isPlaying={isPlaying}
                                    currentTime={currentTime}
                                    duration={duration}
                                    volume={volume}
                                    repeatMode={repeatMode}
                                    shuffle={shuffle}
                                    disableControls={!currentTrack || isTrackLoading}
                                    onPlayPause={handlePlayPause}
                                    onPrevious={handlePrevious}
                                    onNext={handleNext}
                                    onSeek={handleSeek}
                                    onVolumeChange={handleVolumeChange}
                                    onToggleShuffle={handleToggleShuffle}
                                    onCycleRepeat={handleCycleRepeat}
                                />
                            </NowPlaying>
                        </div>
                        {error ? <p className="error app__error">{error}</p> : null}
                        <div className="app__library">
                            <aside className="card app__playlists">
                                <PlaylistList
                                    playlists={playlistSummaries}
                                    selectedId={selectedPlaylistId}
                                    onSelect={handleSelectPlaylist}
                                    isLoading={isLoading}
                                />
                            </aside>
                            <section className="app__songs">
                                <TrackList
                                    tracks={visibleTracks}
                                    currentTrackId={currentTrack?.id ?? null}
                                    onSelectTrack={handleSelectTrack}
                                    isLoading={isLoading}
                                    filterValue={filter}
                                    onFilterChange={setFilter}
                                    onRefresh={refreshTracks}
                                    sortKey={sortOptions.key}
                                    sortDirection={sortOptions.direction}
                                    onSortChange={handleSortChange}
                                    title={selectedPlaylist?.label ?? "Songs"}
                                />
                            </section>
                        </div>
                    </>
                ) : (
                    <section className="app__main app__main--center">
                        <LoginForm
                            onSubmit={connect}
                            isLoading={isLoading}
                            error={error}
                            initialConfig={storedConfig}
                        />
                    </section>
                )}
            </main>
            {connected ? (
                <aside
                    className="connection-dock"
                    tabIndex={0}
                    role="complementary"
                    aria-label="Connection details"
                >
                    <div className="connection-dock__tab" aria-hidden="true">
                        Connection
                    </div>
                    <div className="connection-dock__card">
                        <ConnectionCard
                            connection={connection}
                            trackCount={tracks.length}
                            isLoading={isLoading}
                            onRefresh={refreshTracks}
                            onDisconnect={disconnect}
                        />
                    </div>
                </aside>
            ) : null}
            <audio ref={audioRef} hidden preload="none" />
        </div>
    );
}
