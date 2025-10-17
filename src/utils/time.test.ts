import { describe, expect, it } from "vitest";
import { formatTime } from "./time";

describe("formatTime", () => {
    it("formats seconds into mm:ss", () => {
        expect(formatTime(125)).toBe("2:05");
    });

    it("formats long durations into hh:mm:ss", () => {
        expect(formatTime(3661)).toBe("1:01:01");
    });

    it("handles invalid values", () => {
        expect(formatTime(Number.NaN)).toBe("0:00");
        expect(formatTime(-4)).toBe("0:00");
    });
});
