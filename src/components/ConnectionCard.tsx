import type { ConnectionConfig } from "../types";

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
                <button type="button" onClick={onRefresh} disabled={isLoading}>
                    {isLoading ? "Syncing…" : "Refresh"}
                </button>
                <button type="button" className="secondary" onClick={onDisconnect}>
                    Disconnect
                </button>
            </div>
        </section>
    );
}
