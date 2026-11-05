import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSummarySession,
  readSummarySession,
  saveSummarySession,
} from "@/stores/summarySession";

// 모든 값은 가짜 데이터입니다.
const session = { intakeId: "intake-1", summaryId: "summary-1" };
const STORAGE_KEY = "jinryo:summary-session";

function createStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

let storage: Storage;

beforeEach(() => {
  storage = createStorage();
  vi.stubGlobal("window", { sessionStorage: storage });
  clearSummarySession();
});

afterEach(() => {
  clearSummarySession();
  vi.unstubAllGlobals();
});

describe("요약지 세션", () => {
  it("저장하면 읽을 수 있고, 읽기만 하면 지우지 않는다", () => {
    expect(readSummarySession()).toBeNull();

    saveSummarySession(session);

    expect(readSummarySession()).toEqual(session);
    expect(readSummarySession()).toEqual(session);
  });

  it("지우면 읽을 수 없다", () => {
    saveSummarySession(session);

    clearSummarySession();

    expect(readSummarySession()).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("다시 저장하면 새 값으로 바뀐다", () => {
    saveSummarySession(session);

    saveSummarySession({ intakeId: "intake-2", summaryId: "summary-2" });

    expect(readSummarySession()).toEqual({
      intakeId: "intake-2",
      summaryId: "summary-2",
    });
  });

  it("새로고침해도 이어지도록 sessionStorage에서 읽는다", () => {
    saveSummarySession(session);
    // 새로고침하면 메모리는 사라지고 저장소만 남는다.
    const stored = storage.getItem(STORAGE_KEY);
    clearSummarySession();
    storage.setItem(STORAGE_KEY, stored ?? "");

    expect(readSummarySession()).toEqual(session);
  });

  it("두 ID 말고는 저장소에 넣지 않는다", () => {
    // 문진 응답 전체처럼 다른 값이 딸린 객체를 넘겨도 ID만 남아야 한다.
    const intakeResponse = {
      ...session,
      status: "COMPLETED",
      collected: ["다리·무릎", "OO 불편"],
      department: { departmentName: "정형외과" },
      text: "OO이 불편해요",
    };

    saveSummarySession(intakeResponse);

    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "null")).toEqual(session);
    expect(storage.getItem(STORAGE_KEY)).not.toContain("OO");
    expect(readSummarySession()).toEqual(session);
  });

  it("저장소에 다른 값이 섞여 있어도 ID만 읽는다", () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, mainSymptom: "OO 불편" }),
    );

    expect(readSummarySession()).toEqual(session);
  });

  it.each([
    ["JSON이 아닌 값", "{"],
    ["객체가 아닌 값", JSON.stringify("summary-1")],
    ["null", "null"],
    ["intakeId가 없는 값", JSON.stringify({ summaryId: "summary-1" })],
    ["summaryId가 숫자인 값", JSON.stringify({ intakeId: "i", summaryId: 1 })],
    ["빈 ID", JSON.stringify({ intakeId: "", summaryId: "summary-1" })],
  ])("%s이면 세션이 없는 것으로 본다", (_name, raw) => {
    storage.setItem(STORAGE_KEY, raw);

    expect(readSummarySession()).toBeNull();
  });

  it.each([
    ["빈 intakeId", { intakeId: "", summaryId: "summary-1" }],
    ["빈 summaryId", { intakeId: "intake-1", summaryId: "" }],
  ])("%s는 저장하지 않는다", (_name, invalid) => {
    saveSummarySession(invalid);

    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(readSummarySession()).toBeNull();
  });
});

describe("저장소를 쓸 수 없을 때", () => {
  it("sessionStorage 접근이 막혀도 던지지 않고 이 페이지에서는 이어진다", () => {
    vi.stubGlobal("window", {
      get sessionStorage(): Storage {
        throw new Error("blocked");
      },
    });

    expect(() => saveSummarySession(session)).not.toThrow();
    expect(readSummarySession()).toEqual(session);
    expect(() => clearSummarySession()).not.toThrow();
    expect(readSummarySession()).toBeNull();
  });

  it("저장소에 쓰는 것이 실패해도(용량 초과 등) 던지지 않고 이어진다", () => {
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    expect(() => saveSummarySession(session)).not.toThrow();
    expect(readSummarySession()).toEqual(session);
  });

  it("저장소에서 읽는 것이 실패해도 던지지 않는다", () => {
    saveSummarySession(session);
    vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => readSummarySession()).not.toThrow();
    expect(readSummarySession()).toEqual(session);
  });

  it("지우는 것이 실패해도 던지지 않는다", () => {
    saveSummarySession(session);
    vi.spyOn(storage, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => clearSummarySession()).not.toThrow();
  });

  it("window가 없는 환경(서버 렌더링 등)에서도 던지지 않는다", () => {
    vi.unstubAllGlobals();

    expect(() => saveSummarySession(session)).not.toThrow();
    expect(readSummarySession()).toEqual(session);
    clearSummarySession();
    expect(readSummarySession()).toBeNull();
  });
});
