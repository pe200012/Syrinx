import type { ChangeEvent, MouseEvent } from "react";
import type { Track } from "../types";
import { humanFileSize } from "../services/webdavClient";
import type { TrackSortDirection, TrackSortKey } from "../utils/tracks";
import searchIcon from "@fluentui/svg-icons/icons/search_24_regular.svg";
import refreshIcon from "@fluentui/svg-icons/icons/arrow_clockwise_24_regular.svg";
import sortAscIcon from "@fluentui/svg-icons/icons/text_sort_ascending_20_filled.svg";
import sortDescIcon from "@fluentui/svg-icons/icons/text_sort_descending_20_filled.svg";

const sortableColumns: Array<{ key: TrackSortKey; label: string }> = [
    { key: "title", label: "Title" },
    { key: "artist", label: "Artist" },
    { key: "album", label: "Album" }
];

export interface TrackListProps {
    tracks: Track[];
    currentTrackId: string | null;
    onSelectTrack: (track: Track) => void;
    isLoading?: boolean;
    filterValue: string;
    onFilterChange: (value: string) => void;
    onRefresh?: () => void;
    sortKey: TrackSortKey;
    sortDirection: TrackSortDirection;
    onSortChange: (key: TrackSortKey) => void;
}

export default function TrackList({
    tracks,
    currentTrackId,
    onSelectTrack,
    isLoading,
    filterValue,
    onFilterChange,
    onRefresh,
    sortKey,
    sortDirection,
    onSortChange
}: TrackListProps) {
    const hasTracks = tracks.length > 0;

    const handleSort = (event: MouseEvent<HTMLButtonElement>, key: TrackSortKey) => {
        event.preventDefault();
        onSortChange(key);
    };

    return (
        <section className="card track-list">
            <header className="track-list__header">
                <h2>Library</h2>
                <div className="track-list__actions">
                    <label className="search-field">
                        <img src={searchIcon} alt="" aria-hidden className="icon" />
                        <span className="visually-hidden">Search tracks</span>
                        <input
                            type="search"
                            placeholder="Search tracks"
                            value={filterValue}
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                onFilterChange(event.target.value)
                            }
                            aria-label="Search tracks"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="button-with-icon"
                        title="Refresh library"
                    >
                        <img
                            src={refreshIcon}
                            alt=""
                            aria-hidden
                            className={`icon ${isLoading ? "spin" : ""}`}
                        />
                        <span>{isLoading ? "Syncing…" : "Refresh"}</span>
                    </button>
                </div>
            </header>
            {isLoading ? <p>Loading tracks…</p> : null}
            {!isLoading && !hasTracks ? <p className="muted">No audio files found.</p> : null}
            <div className="track-list__table">
                <table>
                    <thead>
                        <tr>
                            {sortableColumns.map(({ key, label }) => {
                                const isActive = key === sortKey;
                                return (
                                    <th
                                        key={key}
                                        aria-sort={
                                            isActive
                                                ? sortDirection === "asc"
                                                    ? "ascending"
                                                    : "descending"
                                                : "none"
                                        }
                                    >
                                        <button type="button" onClick={(event) => handleSort(event, key)}>
                                            <span>{label}</span>
                                            {isActive ? (
                                                <img
                                                    src={sortDirection === "asc" ? sortAscIcon : sortDescIcon}
                                                    alt=""
                                                    aria-hidden
                                                    className="icon"
                                                />
                                            ) : null}
                                        </button>
                                    </th>
                                );
                            })}
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tracks.map((track) => {
                            const isActive = track.id === currentTrackId;
                            const title = track.metadata?.title ?? track.name;
                            const artist = track.metadata?.artist ?? "—";
                            const album = track.metadata?.album ?? "—";
                            const modified = track.lastModified
                                ? new Date(track.lastModified).toLocaleDateString()
                                : "";
                            const size = track.size !== undefined ? humanFileSize(track.size) : "";

                            return (
                                <tr
                                    key={track.id}
                                    className={isActive ? "active" : undefined}
                                    onClick={() => onSelectTrack(track)}
                                >
                                    <td data-label="Title">
                                        <div>
                                            <strong>{title}</strong>
                                            {track.metadata?.title ? (
                                                <small className="muted">{track.name}</small>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td data-label="Artist">{artist}</td>
                                    <td data-label="Album">{album}</td>
                                    <td data-label="Details">
                                        <span className="muted">
                                            {modified}
                                            {modified && size ? " · " : ""}
                                            {size}
                                        </span>
                                        <div className="muted track-path">{track.displayPath}</div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
