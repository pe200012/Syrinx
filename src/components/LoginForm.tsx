import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import type { ConnectionConfig } from "../types";

export interface LoginFormProps {
    onSubmit: (config: ConnectionConfig) => void;
    isLoading?: boolean;
    error?: string | null;
    initialConfig?: ConnectionConfig | null;
}

const DEFAULTS: ConnectionConfig = {
    baseUrl: "",
    username: "",
    password: "",
    rootPath: "/",
    recursive: false,
    remember: false
};

export default function LoginForm({
    onSubmit,
    isLoading,
    error,
    initialConfig
}: LoginFormProps) {
    const [form, setForm] = useState<ConnectionConfig>(initialConfig ?? DEFAULTS);

    useEffect(() => {
        if (initialConfig) {
            setForm((prev: ConnectionConfig) => ({ ...prev, ...initialConfig }));
        }
    }, [initialConfig]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!form.baseUrl) {
            return;
        }
        onSubmit(form);
    };

    const updateField = <K extends keyof ConnectionConfig>(
        key: K,
        value: ConnectionConfig[K]
    ) => {
        setForm((prev: ConnectionConfig) => ({ ...prev, [key]: value }));
    };

    return (
        <form className="card" onSubmit={handleSubmit}>
            <h2>Connect to WebDAV</h2>
            <label>
                Server URL
                <input
                    type="url"
                    placeholder="https://example.com/webdav"
                    value={form.baseUrl}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateField("baseUrl", event.target.value)
                    }
                    required
                    disabled={isLoading}
                />
            </label>
            <label>
                Root path
                <input
                    type="text"
                    placeholder="/music"
                    value={form.rootPath}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateField("rootPath", event.target.value)
                    }
                    disabled={isLoading}
                />
            </label>
            <div className="two-column">
                <label>
                    Username
                    <input
                        type="text"
                        autoComplete="username"
                        value={form.username ?? ""}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            updateField("username", event.target.value)
                        }
                        disabled={isLoading}
                    />
                </label>
                <label>
                    Password
                    <input
                        type="password"
                        autoComplete="current-password"
                        value={form.password ?? ""}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            updateField("password", event.target.value)
                        }
                        disabled={isLoading}
                    />
                </label>
            </div>
            <label className="checkbox">
                <input
                    type="checkbox"
                    checked={form.recursive}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateField("recursive", event.target.checked)
                    }
                    disabled={isLoading}
                />
                Scan subfolders
            </label>
            <label className="checkbox">
                <input
                    type="checkbox"
                    checked={Boolean(form.remember)}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateField("remember", event.target.checked)
                    }
                    disabled={isLoading}
                />
                Remember connection on this device
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button type="submit" className="primary" disabled={isLoading}>
                {isLoading ? "Connecting…" : "Connect"}
            </button>
        </form>
    );
}
