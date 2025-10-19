import type { Track } from "../types";
import { humanFileSize } from "../services/webdavClient";

export interface NowPlayingProps {
    track: Track | null;
    coverArtUrl: string | null;
    isPlaying: boolean;
}

export default function NowPlaying({ track, coverArtUrl, isPlaying }: NowPlayingProps) {
    if (!track) {
        return (
            <section className="card now-playing">
                <p className="muted">Choose a track to start listening.</p>
            </section>
        );
    }

    const title = track.metadata?.title?.trim() || track.name;
    const artist = track.metadata?.artist?.trim() || "Unknown artist";
    const album = track.metadata?.album?.trim() || "Unknown album";
    const shouldShowFilename = !track.metadata?.title;
    const size = track.size ? humanFileSize(track.size) : "";

    return (
        <section className="card now-playing">
            {coverArtUrl ? (
                <img src={coverArtUrl} alt={track.name} className="now-playing__art" />
            ) : (
                <div className="now-playing__art placeholder" aria-hidden />
            )}
            <div className="now-playing__meta">
                <span className="now-playing__status">{isPlaying ? "Now playing" : "Paused"}</span>
                <h3>{title}</h3>
                <p>{artist}</p>
                <p className="muted">{album}</p>
                {shouldShowFilename ? <p className="muted">{track.name}</p> : null}
                <p className="muted">
                    {track.contentType ?? "Unknown type"}
                    {size ? ` · ${size}` : ""}
                </p>
            </div>
        </section>
    );
}
