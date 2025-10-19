export interface WebDavConnection {
    baseUrl: string;
    username?: string;
    password?: string;
}

export interface TrackMetadata {
    title?: string;
    artist?: string;
    album?: string;
    trackNumber?: number;
}

export interface Track {
    id: string;
    name: string;
    path: string;
    size?: number;
    contentType?: string;
    lastModified?: string;
    displayPath: string;
    metadata?: TrackMetadata | null;
}

export interface ConnectionConfig extends WebDavConnection {
    rootPath: string;
    recursive: boolean;
    remember?: boolean;
}
