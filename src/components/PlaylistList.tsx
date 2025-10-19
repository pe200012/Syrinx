import { useState } from "react";
import addIcon from "@fluentui/svg-icons/icons/add_24_regular.svg";
import deleteIcon from "@fluentui/svg-icons/icons/delete_24_regular.svg";

export interface PlaylistSummary {
    id: string;
    label: string;
    count: number;
}

export interface PlaylistListProps {
    playlists: PlaylistSummary[];
    selectedId: string;
    onSelect: (id: string) => void;
    onCreate?: (name: string) => void;
    onDelete?: (id: string) => void;
    isLoading?: boolean;
}

export default function PlaylistList({
    playlists,
    selectedId,
    onSelect,
    onCreate,
    onDelete,
    isLoading
}: PlaylistListProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");

    const totalTracks = playlists.find((playlist) => playlist.id === "all")?.count ?? 0;

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPlaylistName.trim() && onCreate) {
            onCreate(newPlaylistName.trim());
            setNewPlaylistName("");
            setIsCreating(false);
        }
    };

    const handleDelete = (e: React.MouseEvent, playlistId: string) => {
        e.stopPropagation();
        if (onDelete && playlistId !== "all") {
            if (confirm("Are you sure you want to delete this playlist?")) {
                onDelete(playlistId);
            }
        }
    };

    return (
        <div className="playlist-list">
            <header className="playlist-list__header">
                <h2>Playlists</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="muted">{totalTracks} tracks</span>
                    {onCreate && (
                        <button
                            type="button"
                            className="icon-button"
                            onClick={() => setIsCreating(true)}
                            disabled={isLoading || isCreating}
                            aria-label="Create new playlist"
                            title="Create playlist"
                        >
                            <img src={addIcon} alt="" aria-hidden className="icon" />
                        </button>
                    )}
                </div>
            </header>
            {isCreating && (
                <form onSubmit={handleCreateSubmit} style={{ marginBottom: "12px" }}>
                    <input
                        type="text"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        placeholder="Playlist name..."
                        autoFocus
                        style={{ marginBottom: "8px" }}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button type="submit" className="primary" disabled={!newPlaylistName.trim()}>
                            Create
                        </button>
                        <button type="button" className="secondary" onClick={() => {
                            setIsCreating(false);
                            setNewPlaylistName("");
                        }}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}
            {playlists.length === 0 ? (
                <p className="muted">No playlists available yet.</p>
            ) : (
                <ul className="playlist-list__items">
                    {playlists.map((playlist) => {
                        const isSelected = playlist.id === selectedId;
                        const canDelete = playlist.id !== "all" && onDelete;
                        return (
                            <li key={playlist.id}>
                                <button
                                    type="button"
                                    className={`playlist-list__button ${isSelected ? "active" : ""}`}
                                    onClick={() => onSelect(playlist.id)}
                                    aria-pressed={isSelected}
                                    disabled={isLoading}
                                >
                                    <span className="playlist-list__label">{playlist.label}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="playlist-list__count" aria-hidden>
                                            {playlist.count}
                                        </span>
                                        {canDelete && (
                                            <button
                                                type="button"
                                                className="icon-button"
                                                onClick={(e) => handleDelete(e, playlist.id)}
                                                aria-label={`Delete ${playlist.label}`}
                                                title="Delete playlist"
                                                style={{ width: "32px", height: "32px" }}
                                            >
                                                <img src={deleteIcon} alt="" aria-hidden style={{ width: "16px", height: "16px" }} />
                                            </button>
                                        )}
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
