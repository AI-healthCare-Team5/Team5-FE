import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/errors";
import {
  answerIntake,
  cancelIntake,
  getIntake,
  getIntakeDepartment,
  goBackIntake,
  startIntake,
  type IntakeResponse,
} from "@/api/intakes";

// 모든 값은 가짜 데이터입니다.
type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn<Handler>>;

const intakeId = "3f2a9c1e-0000-4000-8000-000000000001";

const request = {
  questionId: "q_swelling",
  inputMode: "BUTTON" as const,
  answer: "YES",
};

function envelope(
  status: number,
  body: {
    isSuccess: boolean;
    code: string;
    message?: string;
    result?: unknown;
  },
) {
  return new Response(JSON.stringify({ message: "", result: null, ...body }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ok = (code: string, result: unknown) =>
  envelope(200, { isSuccess: true, code, result });
const fail = (status: number, code: string, result: unknown = null) =>
  envelope(status, { isSuccess: false, code, message: "안내 문장", result });

function intakeResponse(overrides: Partial<IntakeResponse> = {}) {
  const base: IntakeResponse = {
    intakeId,
    status: "IN_PROGRESS",
    stage: "SYMPTOM",
    progress: { current: 1, total: 7 },
    collected: ["OO 불편"],
    question: {
      questionId: "q_swelling",
      text: "아픈 곳이 부었나요?",
      answerType: "YES_NO_UNKNOWN",
      options: null,
    },
    reask: false,
    emergency: null,
    department: null,
    summaryId: null,
  };
  return { ...base, ...overrides };
}

function calledRequest(index = 0) {
  const [url, init] = fetchMock.mock.calls[index];
  return { url, init };
}

beforeEach(() => {
  fetchMock = vi.fn<Handler>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("문진 요청", () => {
  it("문진 시작은 POST /api/intakes에 입력 값을 본문으로 보낸다", async () => {
    const result = intakeResponse({ stage: "BASIC_INFO" });
    fetchMock.mockResolvedValueOnce(ok("INTAKE_201", result));

    await expect(
      startIntake({
        inputMode: "BUTTON",
        text: "계단에서 더 불편해요",
        bodyPart: "LEG_KNEE",
        onset: "DAYS_2_3",
      }),
    ).resolves.toEqual(result);

    const { url, init } = calledRequest();
    expect(url).toBe("/api/intakes");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      inputMode: "BUTTON",
      text: "계단에서 더 불편해요",
      bodyPart: "LEG_KNEE",
      onset: "DAYS_2_3",
    });
  });

  it("글로 시작할 때는 쓰지 않는 필드를 본문에 넣지 않는다", async () => {
    fetchMock.mockResolvedValueOnce(ok("INTAKE_201", intakeResponse()));

    await startIntake({ inputMode: "TEXT", text: "무릎이 아파요" });

    expect(JSON.parse(String(calledRequest().init.body))).toEqual({
      inputMode: "TEXT",
      text: "무릎이 아파요",
    });
  });

  it("문진 조회는 GET /api/intakes/{intakeId}를 부른다", async () => {
    const result = intakeResponse();
    fetchMock.mockResolvedValueOnce(ok("INTAKE_200", result));

    await expect(getIntake(intakeId)).resolves.toEqual(result);

    const { url, init } = calledRequest();
    expect(url).toBe(`/api/intakes/${intakeId}`);
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("답변은 POST /api/intakes/{intakeId}/answers에 questionId·inputMode·answer를 보낸다", async () => {
    const result = intakeResponse({ progress: { current: 2, total: 7 } });
    fetchMock.mockResolvedValueOnce(ok("INTAKE_200", result));
    const request = {
      questionId: "q_swelling",
      inputMode: "BUTTON" as const,
      answer: "YES",
    };

    await expect(answerIntake(intakeId, request)).resolves.toEqual({
      kind: "advanced",
      intake: result,
    });

    const { url, init } = calledRequest();
    expect(url).toBe(`/api/intakes/${intakeId}/answers`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(request);
  });

  it("이전 질문은 본문 없이 POST /api/intakes/{intakeId}/back을 부른다", async () => {
    const result = intakeResponse();
    fetchMock.mockResolvedValueOnce(ok("INTAKE_200", result));

    await expect(goBackIntake(intakeId)).resolves.toEqual({
      kind: "advanced",
      intake: result,
    });

    const { url, init } = calledRequest();
    expect(url).toBe(`/api/intakes/${intakeId}/back`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });

  it("취소는 본문 없이 POST /api/intakes/{intakeId}/cancel을 부른다", async () => {
    const result = { intakeId, status: "CANCELED" };
    fetchMock.mockResolvedValueOnce(ok("INTAKE_200", result));

    await expect(cancelIntake(intakeId)).resolves.toEqual(result);

    const { url, init } = calledRequest();
    expect(url).toBe(`/api/intakes/${intakeId}/cancel`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });

  it("추천 진료과는 GET /api/intakes/{intakeId}/department를 부른다", async () => {
    const result = {
      intakeId,
      departmentCode: "05",
      departmentName: "정형외과",
      recommendReason: "정형외과 진료를 권해요.",
    };
    fetchMock.mockResolvedValueOnce(ok("DEPARTMENT_200", result));

    await expect(getIntakeDepartment(intakeId)).resolves.toEqual(result);

    const { url, init } = calledRequest();
    expect(url).toBe(`/api/intakes/${intakeId}/department`);
    expect(init.method).toBe("GET");
  });

  it("경로의 ID는 주소로 쓸 수 있게 인코딩한다", async () => {
    fetchMock.mockResolvedValueOnce(ok("INTAKE_200", intakeResponse()));

    await getIntake("a/b?c");

    expect(calledRequest().url).toBe("/api/intakes/a%2Fb%3Fc");
  });

  it("응급 상태 응답의 emergency를 그대로 돌려준다", async () => {
    const emergency = {
      userUtterance: "가슴이 조이고 식은땀이 나요",
      redFlagCategory: "CHEST_PAIN" as const,
    };
    const result = intakeResponse({
      status: "EMERGENCY",
      question: null,
      emergency,
    });
    fetchMock.mockResolvedValueOnce(ok("INTAKE_201", result));

    const response = await startIntake({ inputMode: "TEXT", text: "OO" });

    expect(response.status).toBe("EMERGENCY");
    expect(response.emergency).toEqual(emergency);
  });
});

describe("INTAKE_409", () => {
  it.each([
    ["답변", () => answerIntake(intakeId, request)],
    ["이전 질문", () => goBackIntake(intakeId)],
  ])(
    "%s: result.status가 있으면 그 상태를 돌려주고 다시 조회하지 않는다",
    async (_name, call) => {
      fetchMock.mockResolvedValueOnce(
        fail(409, "INTAKE_409", { status: "COMPLETED" }),
      );

      await expect(call()).resolves.toEqual({
        kind: "ended",
        status: "COMPLETED",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ["답변", () => answerIntake(intakeId, request)],
    ["이전 질문", () => goBackIntake(intakeId)],
  ])(
    "%s: result가 null이면 GET으로 한 번만 다시 조회해 그 결과를 돌려준다",
    async (_name, call) => {
      const current = intakeResponse({ progress: { current: 3, total: 7 } });
      fetchMock
        .mockResolvedValueOnce(fail(409, "INTAKE_409"))
        .mockResolvedValueOnce(ok("INTAKE_200", current));

      await expect(call()).resolves.toEqual({
        kind: "resynced",
        intake: current,
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const refetch = calledRequest(1);
      expect(refetch.url).toBe(`/api/intakes/${intakeId}`);
      expect(refetch.init.method).toBe("GET");
    },
  );

  it("status가 알려진 값이 아니면 중복 전송으로 보고 다시 조회한다", async () => {
    const current = intakeResponse();
    fetchMock
      .mockResolvedValueOnce(fail(409, "INTAKE_409", { status: "UNKNOWN" }))
      .mockResolvedValueOnce(ok("INTAKE_200", current));

    await expect(answerIntake(intakeId, request)).resolves.toEqual({
      kind: "resynced",
      intake: current,
    });
  });

  it("다시 조회한 요청이 실패하면 더 시도하지 않고 그 오류를 던진다", async () => {
    fetchMock
      .mockResolvedValueOnce(fail(409, "INTAKE_409"))
      .mockResolvedValueOnce(fail(404, "INTAKE_404"));

    const promise = answerIntake(intakeId, request);

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ code: "INTAKE_404" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("다시 조회가 또 INTAKE_409여도 한 번만 조회한다", async () => {
    fetchMock
      .mockResolvedValueOnce(fail(409, "INTAKE_409"))
      .mockResolvedValueOnce(fail(409, "INTAKE_409"));

    await expect(answerIntake(intakeId, request)).rejects.toMatchObject({
      code: "INTAKE_409",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    "INTAKE_400",
    "INTAKE_403",
    "INTAKE_404",
    "INTAKE_429",
    "INTAKE_503",
  ])("%s는 다시 조회하지 않고 ApiError로 던진다", async (code) => {
    fetchMock.mockResolvedValueOnce(fail(Number(code.slice(-3)), code));

    await expect(answerIntake(intakeId, request)).rejects.toMatchObject({
      code,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
