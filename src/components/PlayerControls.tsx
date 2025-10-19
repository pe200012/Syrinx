import { useId, type ChangeEvent } from "react";
import { formatTime } from "../utils/time";
import shuffleFilled from "@fluentui/svg-icons/icons/arrow_shuffle_24_filled.svg";
import shuffleRegular from "@fluentui/svg-icons/icons/arrow_shuffle_24_regular.svg";
import previousIcon from "@fluentui/svg-icons/icons/previous_24_regular.svg";
import nextIcon from "@fluentui/svg-icons/icons/next_24_regular.svg";
import playIcon from "@fluentui/svg-icons/icons/play_24_filled.svg";
import pauseIcon from "@fluentui/svg-icons/icons/pause_24_filled.svg";
import repeatAllIcon from "@fluentui/svg-icons/icons/arrow_repeat_all_24_filled.svg";
import repeatOneIcon from "@fluentui/svg-icons/icons/arrow_repeat_1_24_filled.svg";
import repeatOffIcon from "@fluentui/svg-icons/icons/arrow_repeat_all_off_24_regular.svg";
import volumeIcon from "@fluentui/svg-icons/icons/speaker_2_24_regular.svg";
import timelineNoteIcon from "@fluentui/svg-icons/icons/music_note_2_24_filled.svg";

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

    const hasDuration = Number.isFinite(duration) && duration > 0;
    const safeDuration = hasDuration ? duration : 0;
    const safeCurrentTime = hasDuration && Number.isFinite(currentTime) ? Math.min(currentTime, safeDuration) : 0;
    const progressPercent = hasDuration ? Math.min((safeCurrentTime / safeDuration) * 100, 100) : 0;
    const timelineDisabled = disableControls || !hasDuration;
    const timelineClasses = [
        "timeline-slider",
        isPlaying && !timelineDisabled ? "timeline-slider--active" : "",
        timelineDisabled ? "timeline-slider--disabled" : ""
    ]
        .filter(Boolean)
        .join(" ");

    const volumeSliderId = useId();

    return (
        <div className="card player-controls">
            <div className="player-controls__timeline">
                <span>{formatTime(currentTime)}</span>
                <div className={timelineClasses}>
                    <div className="timeline-slider__track">
                        <div
                            className="timeline-slider__progress"
                            style={{ width: `${progressPercent}%` }}
                            aria-hidden="true"
                        />
                    </div>
                    <div
                        className="timeline-slider__thumb"
                        style={{ left: `${progressPercent}%` }}
                        aria-hidden="true"
                    >
                        <img src={timelineNoteIcon} alt="" aria-hidden className="timeline-slider__thumb-icon" />
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={safeDuration}
                        step={1}
                        value={safeCurrentTime}
                        onChange={handleSeek}
                        disabled={timelineDisabled}
                        aria-label="Seek"
                        className="timeline-slider__input"
                    />
                </div>
                <span>{formatTime(duration)}</span>
            </div>
            <div className="player-controls__buttons">
                <button
                    type="button"
                    onClick={onToggleShuffle}
                    className={`icon-button ${shuffle ? "active" : ""}`}
                    aria-pressed={shuffle}
                    aria-label={shuffle ? "Disable shuffle" : "Enable shuffle"}
                    title={shuffle ? "Shuffle enabled" : "Shuffle"}
                >
                    <img src={shuffle ? shuffleFilled : shuffleRegular} alt="" aria-hidden className="icon" />
                </button>
                <button
                    type="button"
                    onClick={onPrevious}
                    disabled={disableControls}
                    className="icon-button"
                    aria-label="Previous track"
                    title="Previous"
                >
                    <img src={previousIcon} alt="" aria-hidden className="icon" />
                </button>
                <button
                    type="button"
                    onClick={onPlayPause}
                    disabled={disableControls}
                    className="icon-button primary"
                    aria-label={isPlaying ? "Pause playback" : "Start playback"}
                    title={isPlaying ? "Pause" : "Play"}
                >
                    <img src={isPlaying ? pauseIcon : playIcon} alt="" aria-hidden className="icon" />
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={disableControls}
                    className="icon-button"
                    aria-label="Next track"
                    title="Next"
                >
                    <img src={nextIcon} alt="" aria-hidden className="icon" />
                </button>
                <button
                    type="button"
                    onClick={onCycleRepeat}
                    className={`icon-button ${repeatMode !== "off" ? "active" : ""}`}
                    aria-pressed={repeatMode !== "off"}
                    aria-label={`Cycle repeat mode (currently ${repeatMode})`}
                    title={`Repeat: ${repeatMode === "off" ? "Off" : repeatMode === "all" ? "All" : "One"}`}
                >
                    <img
                        src={repeatMode === "one" ? repeatOneIcon : repeatMode === "all" ? repeatAllIcon : repeatOffIcon}
                        alt=""
                        aria-hidden
                        className="icon"
                    />
                    <span className="icon-button__caption">
                        {repeatMode === "off" ? "Off" : repeatMode === "all" ? "All" : "One"}
                    </span>
                </button>
                <div className={`volume-control ${disableControls ? "volume-control--disabled" : ""}`}>
                    <button
                        type="button"
                        className="icon-button volume-control__button"
                        aria-haspopup="true"
                        aria-controls={volumeSliderId}
                        aria-label="Adjust volume"
                        disabled={disableControls}
                    >
                        <img src={volumeIcon} alt="" aria-hidden className="icon" />
                    </button>
                    <div className="volume-control__slider-box">
                        <label className="visually-hidden" htmlFor={volumeSliderId}>
                            Volume
                        </label>
                        <input
                            id={volumeSliderId}
                            className="volume-control__slider"
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={volume}
                            onChange={handleVolume}
                            disabled={disableControls}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
