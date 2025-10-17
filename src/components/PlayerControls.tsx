import type { ChangeEvent } from "react";
import { formatTime } from "../utils/time";

export type RepeatMode = "off" | "all" | "one";

export interface PlayerControlsProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    repeatMode: RepeatMode;
    shuffle: boolean;
    disableControls?: boolean;
    onPlayPause: () => void;
    onPrevious: () => void;
    onNext: () => void;
    onSeek: (time: number) => void;
    onVolumeChange: (volume: number) => void;
    onToggleShuffle: () => void;
    onCycleRepeat: () => void;
}

export default function PlayerControls({
    isPlaying,
    currentTime,
    duration,
    volume,
    repeatMode,
    shuffle,
    disableControls,
    onPlayPause,
    onPrevious,
    onNext,
    onSeek,
    onVolumeChange,
    onToggleShuffle,
    onCycleRepeat
}: PlayerControlsProps) {
    const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
        onSeek(Number(event.target.value));
    };

    const handleVolume = (event: ChangeEvent<HTMLInputElement>) => {
        onVolumeChange(Number(event.target.value));
    };

    return (
        <div className="card player-controls">
            <div className="player-controls__timeline">
                <span>{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={1}
                    value={Number.isFinite(currentTime) ? Math.min(currentTime, duration) : 0}
                    onChange={handleSeek}
                    disabled={disableControls || !Number.isFinite(duration) || duration === 0}
                />
                <span>{formatTime(duration)}</span>
            </div>
            <div className="player-controls__buttons">
                <button type="button" onClick={onToggleShuffle} className={shuffle ? "active" : ""}>
                    Shuffle
                </button>
                <button type="button" onClick={onPrevious} disabled={disableControls}>
                    Prev
                </button>
                <button type="button" onClick={onPlayPause} disabled={disableControls} className="primary">
                    {isPlaying ? "Pause" : "Play"}
                </button>
                <button type="button" onClick={onNext} disabled={disableControls}>
                    Next
                </button>
                <button type="button" onClick={onCycleRepeat} className={repeatMode !== "off" ? "active" : ""}>
                    Repeat: {repeatMode === "off" ? "Off" : repeatMode === "all" ? "All" : "One"}
                </button>
            </div>
            <div className="player-controls__volume">
                <label>
                    Volume
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={handleVolume}
                    />
                </label>
            </div>
        </div>
    );
}
