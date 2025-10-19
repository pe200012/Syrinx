import type { ConnectionConfig } from "../types";
import refreshIcon from "@fluentui/svg-icons/icons/arrow_clockwise_24_regular.svg";
import disconnectIcon from "@fluentui/svg-icons/icons/plug_disconnected_24_regular.svg";
import spinnerIcon from "@fluentui/svg-icons/icons/spinner_ios_20_regular.svg";

export interface ConnectionCardProps {
    connection: ConnectionConfig;
    trackCount: number;
    isLoading?: boolean;
    onRefresh: () => void;
    onDisconnect: () => void;
}

export default function ConnectionCard({
    connection,
    trackCount,
    isLoading,
    onRefresh,
    onDisconnect
}: ConnectionCardProps) {
    return (
        <section className="card connection-card">
            <h2>Connection</h2>
            <dl>
                <div>
                    <dt>Server</dt>
                    <dd title={connection.baseUrl}>{connection.baseUrl}</dd>
                </div>
                <div>
                    <dt>Root path</dt>
                    <dd>{connection.rootPath || "/"}</dd>
                </div>
                <div>
                    <dt>Tracks loaded</dt>
                    <dd>{trackCount}</dd>
                </div>
            </dl>
            <div className="connection-card__actions">
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="button-with-icon"
                    aria-busy={isLoading}
                >
                    <img
                        src={isLoading ? spinnerIcon : refreshIcon}
                        alt=""
                        aria-hidden
                        className={`icon ${isLoading ? "spin" : ""}`}
                    />
                    <span>{isLoading ? "Syncing…" : "Refresh"}</span>
                </button>
                <button
                    type="button"
                    className="secondary button-with-icon"
                    onClick={onDisconnect}
                >
                    <img src={disconnectIcon} alt="" aria-hidden className="icon" />
                    <span>Disconnect</span>
                </button>
            </div>
        </section>
    );
}
