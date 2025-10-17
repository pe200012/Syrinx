import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConnectionCard from "./components/ConnectionCard";
import LoginForm from "./components/LoginForm";
import NowPlaying from "./components/NowPlaying";
import PlayerControls, { type RepeatMode } from "./components/PlayerControls";
import TrackList from "./components/TrackList";
import type { ConnectionConfig, Track } from "./types";
import { WebDavAudioClient } from "./services/webdavClient";
import { filterTracks, sortTracks } from "./utils/tracks";

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

    const visibleTracks = useMemo(
        () => sortTracks(filterTracks(tracks, filter)),
        [tracks, filter]
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
        if (!currentTrackId && visibleTracks.length > 0) {
            setCurrentTrackId(visibleTracks[0].id);
        }
    }, [currentTrackId, visibleTracks]);

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
                const sorted = sortTracks(fetched);
                setClient(clientInstance);
                setConnection(config);
                setTracks(sorted);
                setCurrentTrackId(sorted[0]?.id ?? null);
                setFilter("");
                const stored = config.remember ? persistConfig(config) : persistConfig(null);
                setStoredConfig(stored);
            } catch (err) {
                console.error(err);
                setClient(null);
                setConnection(null);
                setTracks([]);
                setCurrentTrackId(null);
                setError(
                    err instanceof Error ? err.message : "Failed to connect to WebDAV server."
                );
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const refreshTracks = useCallback(async () => {
        if (!client || !connection) return;
        setIsLoading(true);
        try {
            const fetched = await client.listTracks({
                recursive: connection.recursive,
                rootPath: connection.rootPath
            });
            const sorted = sortTracks(fetched);
            setTracks(sorted);
            setCurrentTrackId((prev: string | null) => {
                if (!prev || !sorted.some((track: Track) => track.id === prev)) {
                    return sorted[0]?.id ?? null;
                }
                return prev;
            });
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Failed to refresh tracks.");
        } finally {
            setIsLoading(false);
        }
    }, [client, connection]);

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

    return (
        <div className="app">
            <header className="app__header">
                <div>
                    <h1>WebDAV Music Player</h1>
                    <p className="muted">Stream your audio library securely from any WebDAV server.</p>
                </div>
            </header>
            <main className="app__layout">
                <aside className="app__sidebar">
                    {client && connection ? (
                        <>
                            <ConnectionCard
                                connection={connection}
                                trackCount={tracks.length}
                                isLoading={isLoading}
                                onRefresh={refreshTracks}
                                onDisconnect={disconnect}
                            />
                            <TrackList
                                tracks={visibleTracks}
                                currentTrackId={currentTrack?.id ?? null}
                                onSelectTrack={handleSelectTrack}
                                isLoading={isLoading}
                                filterValue={filter}
                                onFilterChange={setFilter}
                                onRefresh={refreshTracks}
                            />
                        </>
                    ) : (
                        <LoginForm
                            onSubmit={connect}
                            isLoading={isLoading}
                            error={error}
                            initialConfig={storedConfig}
                        />
                    )}
                </aside>
                <section className="app__content">
                    <NowPlaying track={currentTrack ?? null} coverArtUrl={coverArtUrl} isPlaying={isPlaying} />
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
                    {error ? <p className="error">{error}</p> : null}
                </section>
            </main>
            <audio ref={audioRef} hidden preload="none" />
        </div>
    );
}
