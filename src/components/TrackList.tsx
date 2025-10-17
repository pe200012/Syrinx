import type { ChangeEvent } from "react";
import type { Track } from "../types";
import { humanFileSize } from "../services/webdavClient";

export interface TrackListProps {
    tracks: Track[];
    currentTrackId: string | null;
    onSelectTrack: (track: Track) => void;
    isLoading?: boolean;
    filterValue: string;
    onFilterChange: (value: string) => void;
    onRefresh?: () => void;
}

export default function TrackList({
    tracks,
    currentTrackId,
    onSelectTrack,
    isLoading,
    filterValue,
    onFilterChange,
    onRefresh
}: TrackListProps) {
    const hasTracks = tracks.length > 0;

    return (
        <section className="card track-list">
            <header className="track-list__header">
                <h2>Library</h2>
                <div className="track-list__actions">
                    <input
                        type="search"
                        placeholder="Search tracks"
                        value={filterValue}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            onFilterChange(event.target.value)
                        }
                    />
                    <button type="button" onClick={onRefresh} disabled={isLoading}>
                        Refresh
                    </button>
                </div>
            </header>
            {isLoading ? <p>Loading tracks…</p> : null}
            {!isLoading && !hasTracks ? <p className="muted">No audio files found.</p> : null}
            <ul>
                {tracks.map((track) => {
                    const isActive = track.id === currentTrackId;
                    return (
                        <li key={track.id}>
                            <button
                                type="button"
                                className={isActive ? "active" : ""}
                                onClick={() => onSelectTrack(track)}
                            >
                                <span className="track-name">{track.name}</span>
                                <span className="track-meta">
                                    {track.lastModified ? new Date(track.lastModified).toLocaleDateString() : ""}
                                    {track.size !== undefined ? ` · ${humanFileSize(track.size)}` : ""}
                                </span>
                                <span className="track-path">{track.displayPath}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
