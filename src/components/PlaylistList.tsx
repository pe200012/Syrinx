export interface PlaylistSummary {
    id: string;
    label: string;
    count: number;
}

export interface PlaylistListProps {
    playlists: PlaylistSummary[];
    selectedId: string;
    onSelect: (id: string) => void;
    isLoading?: boolean;
}

export default function PlaylistList({
    playlists,
    selectedId,
    onSelect,
    isLoading
}: PlaylistListProps) {
    const totalTracks = playlists.find((playlist) => playlist.id === "all")?.count ?? 0;

    return (
        <div className="playlist-list">
            <header className="playlist-list__header">
                <h2>Playlists</h2>
                <span className="muted">{totalTracks} tracks</span>
            </header>
            {playlists.length === 0 ? (
                <p className="muted">No playlists available yet.</p>
            ) : (
                <ul className="playlist-list__items">
                    {playlists.map((playlist) => {
                        const isSelected = playlist.id === selectedId;
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
                                    <span className="playlist-list__count" aria-hidden>
                                        {playlist.count}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
