import { describe, expect, it } from "vitest";
import type { ConnectionConfig } from "../types";
import { explainConnectionError } from "./errors";

const baseConfig: ConnectionConfig = {
    baseUrl: "https://example.com/webdav",
    username: "user",
    password: "pass",
    rootPath: "/",
    recursive: false
};

describe("explainConnectionError", () => {
    it("requires a protocol in the URL", () => {
        const config = { ...baseConfig, baseUrl: "example.com/webdav" };
        const message = explainConnectionError(new Error("NetworkError"), config);
        expect(message).toMatch(/must include the protocol/i);
    });

    it("warns about mixed content when app is served over HTTPS", () => {
        const config = { ...baseConfig, baseUrl: "http://remote.local/webdav" };
        const message = explainConnectionError(null, config, { currentProtocol: "https:" });
        expect(message).toMatch(/browsers block loading an http webdav server/i);
    });

    it("maps authentication failures to a friendly message", () => {
        const message = explainConnectionError({ status: 401 }, baseConfig);
        expect(message).toMatch(/authentication/i);
    });

    it("highlights CORS/network issues", () => {
        const error = new Error("NetworkError when attempting to fetch resource.");
        const message = explainConnectionError(error, baseConfig);
        expect(message).toMatch(/cross-origin/i);
    });
});
