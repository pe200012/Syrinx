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

    return (
        <section className="card now-playing">
            {coverArtUrl ? (
                <img src={coverArtUrl} alt={track.name} className="now-playing__art" />
            ) : (
                <div className="now-playing__art placeholder" aria-hidden />
            )}
            <div className="now-playing__meta">
                <span className="now-playing__status">{isPlaying ? "Now playing" : "Paused"}</span>
                <h3>{track.name}</h3>
                <p>{track.displayPath}</p>
                <p className="muted">
                    {track.contentType ?? "Unknown type"}
                    {track.size ? ` · ${humanFileSize(track.size)}` : ""}
                </p>
            </div>
        </section>
    );
}
