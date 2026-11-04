import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  INVALID_RESPONSE,
  NETWORK_ERROR,
  SERVER_ERROR_MESSAGE,
} from "@/api/errors";
import { cancelIntake, startIntake, type IntakeResponse } from "@/api/intakes";
import { beginButtonIntake } from "@/pages/text-input/beginIntake";
import {
  beginIntakeSession,
  readIntakeSession,
  resetIntakeFlow,
} from "@/stores/intakeSession";
import type { ButtonIntakeStartRequest } from "@/stores/intakeStart";
import {
  readSummarySession,
  saveSummarySession,
} from "@/stores/summarySession";

vi.mock("@/api/intakes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/intakes")>()),
  startIntake: vi.fn(),
  cancelIntake: vi.fn(),
}));

// 모든 값은 가짜 데이터입니다.
const request: ButtonIntakeStartRequest = {
  inputMode: "BUTTON",
  bodyPart: "LEG_KNEE",
  onset: "DAYS_2_3",
  text: "계단이 힘들어요",
};
const startMock = vi.mocked(startIntake);
const cancelMock = vi.mocked(cancelIntake);

function intake(overrides: Partial<IntakeResponse> = {}): IntakeResponse {
  return {
    intakeId: "intake-1",
    status: "IN_PROGRESS",
    stage: "BASIC_INFO",
    progress: { current: 1, total: 5 },
    collected: ["다리 · 무릎", "2~3일 전부터"],
    question: {
      questionId: "q_age_group",
      text: "연세가 어떻게 되세요?",
      answerType: "SINGLE_CHOICE",
      options: [{ code: "SIXTIES", label: "60대" }],
    },
    reask: false,
    emergency: null,
    department: null,
    summaryId: null,
    ...overrides,
  };
}

beforeEach(() => {
  startMock.mockReset();
  cancelMock.mockReset();
  cancelMock.mockResolvedValue({ intakeId: "x", status: "CANCELED" });
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    },
  });
  resetIntakeFlow();
});

describe("S04 문진 시작", () => {
  it("버튼으로 시작하면 시작 요청을 그대로 보내고 첫 질문을 기억한다", async () => {
    startMock.mockResolvedValue(intake());

    const result = await beginButtonIntake(request);

    expect(result).toEqual({ kind: "started" });
    expect(startMock).toHaveBeenCalledTimes(1);
    expect(startMock.mock.calls[0][0]).toEqual(request);
    expect(readIntakeSession()?.intake).toEqual(intake());
    expect(cancelMock).not.toHaveBeenCalled();
  });

  it("취소 signal을 요청에 넘긴다", async () => {
    startMock.mockResolvedValue(intake());
    const controller = new AbortController();

    await beginButtonIntake(request, controller.signal);

    expect(startMock.mock.calls[0][1]).toBe(controller.signal);
  });

  it("시작하면 이전 요약지 ID를 지운다", async () => {
    saveSummarySession({ intakeId: "old", summaryId: "old-summary" });
    startMock.mockResolvedValue(intake());

    await beginButtonIntake(request);

    expect(readSummarySession()).toBeNull();
  });

  it("먼저 시작한 문진이 있으면 지우고 새 문진으로 바꾼다", async () => {
    beginIntakeSession(intake({ intakeId: "intake-old" }));
    startMock.mockResolvedValue(intake({ intakeId: "intake-new" }));

    const result = await beginButtonIntake(request);

    expect(result).toEqual({ kind: "started" });
    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(cancelMock.mock.calls[0][0]).toBe("intake-old");
    expect(readIntakeSession()?.intake.intakeId).toBe("intake-new");
  });

  it("먼저 시작한 문진을 지우지 못해도 새 문진은 시작된다", async () => {
    beginIntakeSession(intake({ intakeId: "intake-old" }));
    cancelMock.mockRejectedValue(new ApiError(NETWORK_ERROR, "", 0));
    startMock.mockResolvedValue(intake({ intakeId: "intake-new" }));

    await expect(beginButtonIntake(request)).resolves.toEqual({
      kind: "started",
    });
    // 지우기 실패가 처리되지 않은 reject로 남지 않는지 한 턴 기다려 확인합니다.
    await Promise.resolve();
  });

  it("위험 신호로 시작하면 응급으로 알리고 문진을 기억하지 않는다", async () => {
    startMock.mockResolvedValue(
      intake({
        status: "EMERGENCY",
        question: null,
        emergency: {
          userUtterance: "가슴이 조여요",
          redFlagCategory: "CHEST_PAIN",
        },
      }),
    );

    await expect(beginButtonIntake(request)).resolves.toEqual({
      kind: "emergency",
    });
    expect(readIntakeSession()).toBeNull();
  });

  it("서버가 거절하면 서버 문장을 안내하고 기억하지 않는다", async () => {
    startMock.mockRejectedValue(
      new ApiError("INTAKE_429", "잠시 뒤에 다시 시도해 주세요.", 429),
    );

    await expect(beginButtonIntake(request)).resolves.toEqual({
      kind: "failed",
      message: "잠시 뒤에 다시 시도해 주세요.",
    });
    expect(readIntakeSession()).toBeNull();
  });

  it("네트워크 오류는 공통 서버 오류 문장으로 안내한다", async () => {
    startMock.mockRejectedValue(new ApiError(NETWORK_ERROR, "", 0));

    await expect(beginButtonIntake(request)).resolves.toEqual({
      kind: "failed",
      message: SERVER_ERROR_MESSAGE,
    });
  });

  it("실패한 뒤에 다시 시작하면 이전에 시작한 문진은 건드리지 않는다", async () => {
    beginIntakeSession(intake({ intakeId: "intake-old" }));
    startMock.mockRejectedValueOnce(new ApiError(NETWORK_ERROR, "", 0));

    await beginButtonIntake(request);

    expect(cancelMock).not.toHaveBeenCalled();
    expect(readIntakeSession()?.intake.intakeId).toBe("intake-old");
  });

  it("질문이 없는 응답은 형식 오류로 안내하고 만들어진 문진을 지운다", async () => {
    startMock.mockResolvedValue(intake({ question: null }));

    const result = await beginButtonIntake(request);

    expect(result).toEqual({ kind: "failed", message: SERVER_ERROR_MESSAGE });
    expect(cancelMock.mock.calls[0][0]).toBe("intake-1");
    expect(readIntakeSession()).toBeNull();
  });

  it("형식이 맞지 않은 응답(INVALID_RESPONSE)도 안내한다", async () => {
    startMock.mockRejectedValue(new ApiError(INVALID_RESPONSE, "", 200));

    await expect(beginButtonIntake(request)).resolves.toEqual({
      kind: "failed",
      message: SERVER_ERROR_MESSAGE,
    });
  });

  it("요청 중에 화면을 떠나면 aborted이고, 취소 오류를 안내하지 않는다", async () => {
    const controller = new AbortController();
    startMock.mockImplementation(async () => {
      controller.abort();
      throw new DOMException("aborted", "AbortError");
    });

    await expect(
      beginButtonIntake(request, controller.signal),
    ).resolves.toEqual({ kind: "aborted" });
    expect(readIntakeSession()).toBeNull();
  });

  it("응답이 도착하기 전에 화면을 떠나면 만들어진 문진을 지우고 기억하지 않는다", async () => {
    const controller = new AbortController();
    startMock.mockImplementation(async () => {
      controller.abort();
      return intake();
    });

    await expect(
      beginButtonIntake(request, controller.signal),
    ).resolves.toEqual({ kind: "aborted" });
    expect(cancelMock.mock.calls[0][0]).toBe("intake-1");
    expect(readIntakeSession()).toBeNull();
  });

  it("API 오류가 아닌 예외(코드 실수)는 안내로 바꾸지 않고 던진다", async () => {
    startMock.mockRejectedValue(new TypeError("개발자 실수"));

    await expect(beginButtonIntake(request)).rejects.toThrow("개발자 실수");
  });
});
