import type { ReactNode } from "react";
import type { Track } from "../types";
import { humanFileSize } from "../services/webdavClient";
import playingIcon from "@fluentui/svg-icons/icons/play_circle_24_filled.svg";
import pausedIcon from "@fluentui/svg-icons/icons/pause_circle_24_regular.svg";
import musicPlaceholder from "@fluentui/svg-icons/icons/music_note_2_24_regular.svg";

export interface NowPlayingProps {
    track: Track | null;
    coverArtUrl: string | null;
    isPlaying: boolean;
    children?: ReactNode;
}

export default function NowPlaying({ track, coverArtUrl, isPlaying, children }: NowPlayingProps) {
    if (!track) {
        return (
            <section className="card now-playing now-playing--empty">
                <p className="muted">Choose a track to start listening.</p>
            </section>
        );
    }

    const title = track.metadata?.title?.trim() || track.name;
    const artist = track.metadata?.artist?.trim() || "Unknown artist";
    const album = track.metadata?.album?.trim() || "Unknown album";
    const shouldShowFilename = !track.metadata?.title;
    const size = track.size ? humanFileSize(track.size) : "";
    const statusIcon = isPlaying ? playingIcon : pausedIcon;

    return (
        <section className="card now-playing now-playing--hero">
            <div className="now-playing__art-shell">
                {coverArtUrl ? (
                    <img src={coverArtUrl} alt={track.name} className="now-playing__art" />
                ) : (
                    <div className="now-playing__art placeholder" aria-hidden>
                        <img src={musicPlaceholder} alt="" aria-hidden className="icon" />
                    </div>
                )}
            </div>
            <div className="now-playing__body">
                <span
                    className={`now-playing__status ${isPlaying ? "now-playing__status--playing" : ""}`}
                    aria-live="polite"
                >
                    <img src={statusIcon} alt="" aria-hidden className="icon" />
                    <span>{isPlaying ? "Now playing" : "Paused"}</span>
                </span>
                <h2 className="now-playing__title">{title}</h2>
                <p className="now-playing__artist">{artist}</p>
                <p className="now-playing__album">{album}</p>
                {shouldShowFilename ? <p className="muted">{track.name}</p> : null}
                <p className="muted">
                    {track.contentType ?? "Unknown type"}
                    {size ? ` · ${size}` : ""}
                </p>
                {children ? <div className="now-playing__controls">{children}</div> : null}
            </div>
        </section>
    );
}
