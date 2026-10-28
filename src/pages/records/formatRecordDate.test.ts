import { describe, expect, it } from "vitest";
import { formatRecordDate } from "@/pages/records/formatRecordDate";

describe("기록 날짜 표시", () => {
  it("UTC 날짜가 바뀌기 전에도 한국 날짜로 표시한다", () => {
    expect(formatRecordDate("2026-10-15T15:00:00Z")).toBe("2026.10.16");
  });

  it("월과 일을 두 자리로 표시한다", () => {
    expect(formatRecordDate("2026-09-03T00:00:00Z")).toBe("2026.09.03");
  });
});
