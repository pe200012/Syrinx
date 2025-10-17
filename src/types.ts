export interface WebDavConnection {
    baseUrl: string;
    username?: string;
    password?: string;
}

export interface Track {
    id: string;
    name: string;
    path: string;
    size?: number;
    contentType?: string;
    lastModified?: string;
    displayPath: string;
}

export interface ConnectionConfig extends WebDavConnection {
    rootPath: string;
    recursive: boolean;
    remember?: boolean;
}
