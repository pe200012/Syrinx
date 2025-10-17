import { describe, expect, it } from "vitest";
import { humanFileSize } from "./webdavClient";

describe("humanFileSize", () => {
    it("formats bytes into readable string", () => {
        expect(humanFileSize(0)).toBe("0 B");
        expect(humanFileSize(1024)).toBe("1 KB");
        expect(humanFileSize(1536)).toBe("1.5 KB");
        expect(humanFileSize(1048576)).toBe("1 MB");
    });

    it("handles undefined values", () => {
        expect(humanFileSize(undefined)).toBe("");
    });
});
