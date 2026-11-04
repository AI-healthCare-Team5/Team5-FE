import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IntakeResponse, IntakeStartRequest } from "@/api/intakes";

// VITE_API_MOCK=true일 때의 가짜 응답을 확인합니다. 네트워크는 쓰지 않습니다.
// isMockApi는 모듈을 불러올 때 정해지므로 테스트마다 환경 변수를 정하고 모듈을 새로 불러옵니다.
async function loadMockApi() {
  vi.resetModules();
  vi.stubEnv("VITE_API_MOCK", "true");
  const [intakes, summaries, hospitals, regions] = await Promise.all([
    import("@/api/intakes"),
    import("@/api/summaries"),
    import("@/api/hospitals"),
    import("@/api/regions"),
  ]);
  return { ...intakes, ...summaries, ...hospitals, ...regions };
}

type MockApi = Awaited<ReturnType<typeof loadMockApi>>;

const buttonStart: IntakeStartRequest = {
  inputMode: "BUTTON",
  bodyPart: "LEG_KNEE",
  onset: "DAYS_2_3",
};

// bodyPart가 ETC면 mock 요약지의 첫 생성이 FAILED가 됩니다.
const etcStart: IntakeStartRequest = {
  inputMode: "BUTTON",
  bodyPart: "ETC",
  onset: "TODAY",
};

// 질문 종류에 맞게 답합니다. 선택지는 첫 번째 것을 버튼으로 고르고, 예/아니요는 버튼으로,
// FREE_TEXT(복용약·앓는 병·알레르기)는 글로 답합니다.
const yesNoAnswers: Record<string, string> = {
  q_swelling: "YES",
  q_fall: "NO",
};
const freeTextAnswers: Record<string, string> = {
  q_medications: "OO약",
  q_conditions: "없어요",
  q_allergies: "잘 모르겠어요",
};

function answerFor(
  question: NonNullable<IntakeResponse["question"]>,
  freeTexts: Record<string, string> = freeTextAnswers,
) {
  if (question.answerType === "FREE_TEXT") {
    return {
      inputMode: "TEXT" as const,
      answer: freeTexts[question.questionId],
    };
  }
  return {
    inputMode: "BUTTON" as const,
    answer: question.options?.[0].code ?? yesNoAnswers[question.questionId],
  };
}

async function answerAll(
  api: MockApi,
  first: IntakeResponse,
  freeTexts: Record<string, string> = freeTextAnswers,
): Promise<{ last: IntakeResponse; progress: number[] }> {
  let current = first;
  const progress: number[] = [];
  for (let guard = 0; guard < 20 && current.question; guard += 1) {
    const question = current.question;
    progress.push(current.progress.current);
    const result = await api.answerIntake(current.intakeId, {
      questionId: question.questionId,
      ...answerFor(question, freeTexts),
    });
    if (result.kind !== "advanced")
      throw new Error(`예상 밖 결과: ${result.kind}`);
    current = result.intake;
  }
  return { last: current, progress };
}

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>(() => {
    throw new Error("가짜 응답에서는 네트워크를 쓰지 않아야 해요");
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("가짜 문진 흐름", () => {
  it("버튼으로 시작하면 기본 정보 5문항을 거쳐 COMPLETED가 된다", async () => {
    const api = await loadMockApi();

    const started = await api.startIntake(buttonStart);
    expect(started.status).toBe("IN_PROGRESS");
    expect(started.stage).toBe("BASIC_INFO");
    expect(started.progress).toEqual({ current: 1, total: 5 });
    expect(started.question?.questionId).toBeTruthy();
    expect(started.collected).toEqual(["다리 · 무릎", "2~3일 전부터"]);

    const { last, progress } = await answerAll(api, started);

    expect(progress).toEqual([1, 2, 3, 4, 5]);
    expect(last.status).toBe("COMPLETED");
    expect(last.question).toBeNull();
    expect(last.emergency).toBeNull();
    expect(last.department?.departmentCode).toBe("05");
    expect(last.summaryId).toMatch(/^[0-9a-f-]{36}$/);
    await expect(api.getIntake(started.intakeId)).resolves.toEqual(last);
    await expect(api.getIntakeDepartment(started.intakeId)).resolves.toEqual({
      intakeId: started.intakeId,
      ...last.department,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("나이대 선택지는 실제 서버와 같은 문구다", async () => {
    const api = await loadMockApi();
    const started = await api.startIntake(buttonStart);

    const ageQuestion = started.question!;
    expect(ageQuestion.questionId).toBe("q_age_group");
    expect(ageQuestion.options).toEqual([
      { code: "UNDER_50", label: "50대 이하" },
      { code: "SIXTIES", label: "60대" },
      { code: "SEVENTIES", label: "70대" },
      { code: "OVER_80", label: "80대 이상" },
    ]);
  });

  it("복용약·앓는 병·알레르기는 실제 서버처럼 FREE_TEXT 질문이다", async () => {
    const api = await loadMockApi();
    let current = await api.startIntake(buttonStart);

    const seen: [string, string, boolean][] = [];
    for (let guard = 0; guard < 6 && current.question; guard += 1) {
      const { questionId, answerType, options } = current.question;
      seen.push([questionId, answerType, options === null]);
      const result = await api.answerIntake(current.intakeId, {
        questionId,
        ...answerFor(current.question),
      });
      if (result.kind !== "advanced") throw new Error(result.kind);
      current = result.intake;
    }

    expect(current.status).toBe("COMPLETED");
    expect(seen).toEqual([
      ["q_age_group", "SINGLE_CHOICE", false],
      ["q_gender", "SINGLE_CHOICE", false],
      ["q_medications", "FREE_TEXT", true],
      ["q_conditions", "FREE_TEXT", true],
      ["q_allergies", "FREE_TEXT", true],
    ]);
  });

  it("FREE_TEXT는 글로만 답할 수 있다: 버튼 답과 빈 답은 400이고 상태는 그대로다", async () => {
    const api = await loadMockApi();
    const started = await api.startIntake(buttonStart);
    let current = started;
    for (const code of ["SEVENTIES", "FEMALE"]) {
      const result = await api.answerIntake(current.intakeId, {
        questionId: current.question!.questionId,
        inputMode: "BUTTON",
        answer: code,
      });
      if (result.kind !== "advanced") throw new Error(result.kind);
      current = result.intake;
    }
    expect(current.question).toMatchObject({
      questionId: "q_medications",
      answerType: "FREE_TEXT",
    });

    await expect(
      api.answerIntake(current.intakeId, {
        questionId: "q_medications",
        inputMode: "BUTTON",
        answer: "YES",
      }),
    ).rejects.toMatchObject({ code: "INTAKE_400", status: 400 });
    await expect(
      api.answerIntake(current.intakeId, {
        questionId: "q_medications",
        inputMode: "TEXT",
        answer: "   ",
      }),
    ).rejects.toMatchObject({
      code: "INTAKE_400",
      result: { errors: [{ field: "request" }] },
    });

    await expect(api.getIntake(current.intakeId)).resolves.toEqual(current);
  });

  it("모은 정보에는 선택한 답이 서버와 같은 문구로 쌓이고, FREE_TEXT 답은 넣지 않는다", async () => {
    const api = await loadMockApi();
    let current = await api.startIntake({ ...buttonStart, bodyPart: "BACK" });
    expect(current.collected).toEqual(["허리 · 등", "2~3일 전부터"]);

    const collectedAfter: string[][] = [];
    for (let guard = 0; guard < 5 && current.question; guard += 1) {
      const result = await api.answerIntake(current.intakeId, {
        questionId: current.question.questionId,
        ...answerFor(current.question),
      });
      if (result.kind !== "advanced") throw new Error(result.kind);
      current = result.intake;
      collectedAfter.push(current.collected);
    }

    expect(collectedAfter).toEqual([
      ["허리 · 등", "2~3일 전부터", "50대 이하"],
      ["허리 · 등", "2~3일 전부터", "50대 이하", "남성"],
      ["허리 · 등", "2~3일 전부터", "50대 이하", "남성"],
      ["허리 · 등", "2~3일 전부터", "50대 이하", "남성"],
      ["허리 · 등", "2~3일 전부터", "50대 이하", "남성"],
    ]);
  });

  it("글로 시작하면 증상 질문의 답은 이름을 붙여 모은 정보에 쌓인다", async () => {
    const api = await loadMockApi();
    const started = await api.startIntake({ inputMode: "TEXT", text: "OO" });
    const result = await api.answerIntake(started.intakeId, {
      questionId: started.question!.questionId,
      inputMode: "BUTTON",
      answer: "YES",
    });

    expect(result.kind === "advanced" && result.intake.collected).toEqual([
      "붓기: 네",
    ]);
  });

  it("글로 시작하면 증상 질문 뒤에 기본 정보 질문이 이어진다", async () => {
    const api = await loadMockApi();

    const started = await api.startIntake({
      inputMode: "TEXT",
      text: "OO이 불편해요",
    });
    expect(started.stage).toBe("SYMPTOM");

    const { last, progress } = await answerAll(api, started);

    expect(progress).toEqual([1, 2, 1, 2, 3, 4, 5]);
    expect(last.status).toBe("COMPLETED");

    let response = await api.getSummary(last.summaryId!);
    for (let count = 0; count < 4; count += 1) {
      response = await api.getSummary(last.summaryId!);
    }
    expect(response.summary).toMatchObject({
      inputMode: "TEXT",
      mainSymptom: "OO이 불편해요",
      bodyPart: null,
      onset: null,
      items: [
        { order: 1, label: "붓기", value: "있음" },
        { order: 2, label: "넘어짐", value: "없음" },
      ],
    });
  });

  it("말·글 답변을 알아듣지 못하면 같은 질문을 reask로 다시 묻는다", async () => {
    const api = await loadMockApi();
    const started = await api.startIntake({ inputMode: "TEXT", text: "OO" });
    const question = started.question!;

    const result = await api.answerIntake(started.intakeId, {
      questionId: question.questionId,
      inputMode: "TEXT",
      answer: "글쎄요 OO",
    });

    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") return;
    expect(result.intake.reask).toBe(true);
    expect(result.intake.question?.questionId).toBe(question.questionId);
    expect(result.intake.progress).toEqual(started.progress);
  });

  it("잘못된 시작 요청과 선택지에 없는 버튼 답은 400이다", async () => {
    const api = await loadMockApi();

    await expect(
      api.startIntake({ inputMode: "BUTTON", bodyPart: "LEG_KNEE" }),
    ).rejects.toMatchObject({ code: "INTAKE_400" });
    await expect(api.startIntake({ inputMode: "TEXT" })).rejects.toMatchObject({
      code: "INTAKE_400",
    });

    const started = await api.startIntake(buttonStart);
    await expect(
      api.answerIntake(started.intakeId, {
        questionId: started.question!.questionId,
        inputMode: "BUTTON",
        answer: "NOT_AN_OPTION",
      }),
    ).rejects.toMatchObject({ code: "INTAKE_400" });
  });

  it("이전 질문은 답변을 지우고, 첫 질문에서는 400이다", async () => {
    const api = await loadMockApi();
    const started = await api.startIntake(buttonStart);

    await expect(api.goBackIntake(started.intakeId)).rejects.toMatchObject({
      code: "INTAKE_400",
    });

    const first = started.question!;
    await api.answerIntake(started.intakeId, {
      questionId: first.questionId,
      inputMode: "BUTTON",
      answer: first.options![0].code,
    });
    const back = await api.goBackIntake(started.intakeId);

    expect(back).toEqual({ kind: "advanced", intake: started });
  });

  it("현재 질문이 아닌 답은 resynced, 끝난 문진은 ended로 돌려준다", async () => {
    const api = await loadMockApi();
    const started = await api.startIntake(buttonStart);

    const duplicate = await api.answerIntake(started.intakeId, {
      questionId: "q_not_current",
      inputMode: "BUTTON",
      answer: "YES",
    });
    expect(duplicate).toEqual({ kind: "resynced", intake: started });

    const { last } = await answerAll(api, started);
    const ended = await api.answerIntake(last.intakeId, {
      questionId: "q_gender",
      inputMode: "BUTTON",
      answer: "MALE",
    });
    expect(ended).toEqual({ kind: "ended", status: "COMPLETED" });
    await expect(api.goBackIntake(last.intakeId)).resolves.toEqual({
      kind: "ended",
      status: "COMPLETED",
    });
  });

  it("끝나지 않은 문진의 진료과 조회는 DEPARTMENT_409다", async () => {
    const api = await loadMockApi();
    const started = await api.startIntake(buttonStart);

    await expect(
      api.getIntakeDepartment(started.intakeId),
    ).rejects.toMatchObject({ code: "DEPARTMENT_409" });
  });

  it("취소하면 문진을 지워 이후 조회가 404다", async () => {
    const api = await loadMockApi();
    const started = await api.startIntake(buttonStart);

    await expect(api.cancelIntake(started.intakeId)).resolves.toEqual({
      intakeId: started.intakeId,
      status: "CANCELED",
    });
    await expect(api.getIntake(started.intakeId)).rejects.toMatchObject({
      code: "INTAKE_404",
    });
  });
});

describe("가짜 요약지", () => {
  async function completeIntake(
    api: MockApi,
    start: IntakeStartRequest = buttonStart,
  ) {
    const started = await api.startIntake(start);
    const { last } = await answerAll(api, started);
    return { intakeId: last.intakeId, summaryId: last.summaryId! };
  }

  it("GENERATING을 거쳐 DONE이 되고, 건강 정보의 null과 []가 구분된다", async () => {
    const api = await loadMockApi();
    const { summaryId } = await completeIntake(api);

    const statuses: string[] = [];
    const inProgressSteps: (string | undefined)[] = [];
    let done;
    for (let guard = 0; guard < 10 && !done; guard += 1) {
      const response = await api.getSummary(summaryId);
      statuses.push(response.status);
      inProgressSteps.push(
        response.steps.find((item) => item.status === "IN_PROGRESS")?.step,
      );
      if (response.status === "DONE") done = response;
      else expect(response.summary).toBeNull();
    }

    expect(statuses).toEqual([
      "GENERATING",
      "GENERATING",
      "GENERATING",
      "GENERATING",
      "DONE",
    ]);
    expect(inProgressSteps).toEqual([
      "BASIC_INFO",
      "SYMPTOM",
      "HEALTH_INFO",
      "DEPARTMENT",
      undefined,
    ]);
    expect(done?.steps.map((item) => item.status)).toEqual([
      "DONE",
      "DONE",
      "DONE",
      "DONE",
    ]);
    const summary = done!.summary!;
    expect(summary.medications).toEqual([{ name: "OO약", detail: null }]);
    expect(summary.conditions).toEqual([]);
    expect(summary.allergies).toBeNull();
    expect(summary.department.departmentName).toBe("정형외과");
    expect(summary.isConfirmed).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("글로 답한 건강 정보는 첫 낱말을 이름, 나머지를 설명으로 나누고 없음·모름은 []·null이다", async () => {
    const api = await loadMockApi();
    const started = await api.startIntake(buttonStart);
    const { last } = await answerAll(api, started, {
      q_medications: "혈압약 하루 두 번",
      q_conditions: "고혈압",
      q_allergies: "없어요",
    });
    for (let count = 0; count < 4; count += 1) {
      await api.getSummary(last.summaryId!);
    }

    const summary = (await api.getSummary(last.summaryId!)).summary!;

    expect(summary.medications).toEqual([
      { name: "혈압약", detail: "하루 두 번" },
    ]);
    expect(summary.conditions).toEqual([{ name: "고혈압", detail: null }]);
    expect(summary.allergies).toEqual([]);
  });

  it("pollSummary가 1초 간격으로 DONE까지 이어진다", async () => {
    const api = await loadMockApi();
    const { summaryId } = await completeIntake(api);
    vi.useFakeTimers();
    const progress: string[] = [];

    const promise = api.pollSummary(summaryId, {
      onProgress: (response) => progress.push(response.status),
    });
    await vi.advanceTimersByTimeAsync(4000);

    await expect(promise).resolves.toMatchObject({
      kind: "done",
      summary: { status: "DONE" },
    });
    expect(progress).toEqual([
      "GENERATING",
      "GENERATING",
      "GENERATING",
      "GENERATING",
      "DONE",
    ]);
  });

  it("생성 중에는 수정·확인이 SUMMARY_409다", async () => {
    const api = await loadMockApi();
    const { summaryId } = await completeIntake(api);
    await api.getSummary(summaryId);

    await expect(
      api.updateSummary(summaryId, { mainSymptom: "OO" }),
    ).rejects.toMatchObject({ code: "SUMMARY_409" });
    await expect(api.confirmSummary(summaryId)).rejects.toMatchObject({
      code: "SUMMARY_409",
    });
  });

  it("DONE 뒤에 수정하면 isConfirmed가 false로 돌아가고, 확인하면 true가 된다", async () => {
    const api = await loadMockApi();
    const { summaryId } = await completeIntake(api);
    for (let count = 0; count < 5; count += 1) await api.getSummary(summaryId);

    await expect(api.confirmSummary(summaryId)).resolves.toEqual({
      summaryId,
      isConfirmed: true,
    });
    const afterConfirm = await api.getSummary(summaryId);
    expect(afterConfirm.summary?.isConfirmed).toBe(true);

    const updated = await api.updateSummary(summaryId, {
      mainSymptom: "수정한 OO",
      onset: "OVER_WEEK",
      medications: null,
      conditions: [{ name: "OO", detail: null }],
    });
    expect(updated.summary).toMatchObject({
      mainSymptom: "수정한 OO",
      onset: "OVER_WEEK",
      onsetDetail: "일주일 이상",
      medications: null,
      conditions: [{ name: "OO", detail: null }],
      isConfirmed: false,
    });
  });

  it("없는 항목 order를 수정하면 SUMMARY_400이다", async () => {
    const api = await loadMockApi();
    const { summaryId } = await completeIntake(api);
    for (let count = 0; count < 5; count += 1) await api.getSummary(summaryId);

    await expect(
      api.updateSummary(summaryId, { items: [{ order: 99, value: "있음" }] }),
    ).rejects.toMatchObject({ code: "SUMMARY_400" });
  });

  it("완료됐거나 만드는 중인 요약지를 다시 만들면 SUMMARY_409이고 내용은 그대로다", async () => {
    const api = await loadMockApi();
    const { intakeId, summaryId } = await completeIntake(api);

    await api.getSummary(summaryId);
    await expect(api.retrySummary(intakeId)).rejects.toMatchObject({
      code: "SUMMARY_409",
    });
    // 만드는 중 요청이 진행을 되돌리지 않는다.
    expect((await api.getSummary(summaryId)).steps[1].status).toBe(
      "IN_PROGRESS",
    );

    for (let count = 0; count < 4; count += 1) await api.getSummary(summaryId);
    await api.updateSummary(summaryId, { mainSymptom: "수정한 OO" });
    await expect(api.retrySummary(intakeId)).rejects.toMatchObject({
      code: "SUMMARY_409",
    });
    const after = await api.getSummary(summaryId);
    expect(after.status).toBe("DONE");
    expect(after.summary?.mainSymptom).toBe("수정한 OO");
  });

  it("bodyPart가 ETC면 첫 생성이 FAILED가 되고, 다시 만들면 같은 summaryId로 성공한다", async () => {
    const api = await loadMockApi();
    const { intakeId, summaryId } = await completeIntake(api, etcStart);

    const statuses: string[] = [];
    for (let count = 0; count < 4; count += 1) {
      const response = await api.getSummary(summaryId);
      statuses.push(response.status);
      expect(response.summary).toBeNull();
    }
    expect(statuses).toEqual(["GENERATING", "GENERATING", "FAILED", "FAILED"]);
    await expect(
      api.updateSummary(summaryId, { mainSymptom: "OO" }),
    ).rejects.toMatchObject({ code: "SUMMARY_409" });
    await expect(api.confirmSummary(summaryId)).rejects.toMatchObject({
      code: "SUMMARY_409",
    });

    await expect(api.retrySummary(intakeId)).resolves.toEqual({
      intakeId,
      summaryId,
      status: "GENERATING",
    });
    const again: string[] = [];
    for (let count = 0; count < 5; count += 1) {
      again.push((await api.getSummary(summaryId)).status);
    }
    expect(again).toEqual([
      "GENERATING",
      "GENERATING",
      "GENERATING",
      "GENERATING",
      "DONE",
    ]);
    // 다시 만든 뒤에는 다시 FAILED가 되지 않는다.
    expect((await api.getSummary(summaryId)).status).toBe("DONE");
  });

  it("ETC 흐름: pollSummary가 failed로 알리고, 다시 만든 뒤에는 done으로 끝난다", async () => {
    const api = await loadMockApi();
    const { intakeId, summaryId } = await completeIntake(api, etcStart);
    vi.useFakeTimers();

    const first = api.pollSummary(summaryId);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(first).resolves.toMatchObject({
      kind: "needsRetry",
      reason: "failed",
      last: { status: "FAILED" },
    });

    await api.retrySummary(intakeId);
    const second = api.pollSummary(summaryId);
    await vi.advanceTimersByTimeAsync(4000);
    await expect(second).resolves.toMatchObject({ kind: "done" });
  });

  it("ETC가 아니면 실패하지 않는다", async () => {
    const api = await loadMockApi();
    const { summaryId } = await completeIntake(api, {
      ...buttonStart,
      bodyPart: "SKIN",
    });

    const statuses: string[] = [];
    for (let count = 0; count < 8; count += 1) {
      statuses.push((await api.getSummary(summaryId)).status);
    }
    expect(statuses).not.toContain("FAILED");
    expect(statuses.at(-1)).toBe("DONE");
  });

  it("끝나지 않은 문진의 요약지를 다시 만들면 SUMMARY_409다", async () => {
    const api = await loadMockApi();
    const started = await api.startIntake(buttonStart);

    await expect(api.retrySummary(started.intakeId)).rejects.toMatchObject({
      code: "SUMMARY_409",
    });
  });

  it("없는 요약지는 SUMMARY_404다", async () => {
    const api = await loadMockApi();

    await expect(api.getSummary("not-exist")).rejects.toMatchObject({
      code: "SUMMARY_404",
    });
  });
});

describe("가짜 병원과 시·군", () => {
  it("병원 3곳을 가짜 이름·전화번호로 돌려준다", async () => {
    const api = await loadMockApi();

    const outcome = await api.searchHospitals({
      departmentCode: "05",
      regionCode: "51720",
    });

    expect(outcome.kind).toBe("found");
    if (outcome.kind !== "found") return;
    const { hospitals } = outcome.result;
    expect(hospitals).toHaveLength(3);
    expect(hospitals.map((item) => item.name)).toEqual([
      expect.stringContaining("OO"),
      expect.stringContaining("△△"),
      expect.stringContaining("XX"),
    ]);
    for (const item of hospitals) {
      expect(item.phoneNumber).toBe("000-0000-0000");
    }
    const distances = hospitals.map((item) => item.distanceKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(hospitals.some((item) => item.today?.is24Hours)).toBe(true);
    expect(hospitals.some((item) => item.hasEmergencyRoom)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("위치도 지역도 없으면 needsRegion, 반경 안에 병원이 없으면 empty다", async () => {
    const api = await loadMockApi();

    await expect(api.searchHospitals()).resolves.toMatchObject({
      kind: "needsRegion",
    });
    await expect(
      api.searchHospitals({ regionCode: "51720", radius: 1 }),
    ).resolves.toMatchObject({ kind: "empty" });
  });

  it.each([
    ["radius", { radius: 0 }],
    ["radius", { radius: 31 }],
    ["radius", { radius: 2.5 }],
    ["radius", { radius: Number.NaN }],
    ["radius", { radius: -1 }],
    ["limit", { limit: 0 }],
    ["limit", { limit: 21 }],
    ["limit", { limit: 2.5 }],
    ["limit", { limit: Number.NaN }],
  ])(
    "radius·limit이 정수 범위를 벗어나면 해당 field(%s)로 HOSPITAL_400을 던진다",
    async (field, invalid) => {
      const api = await loadMockApi();

      const promise = api.searchHospitals({ regionCode: "51720", ...invalid });

      await expect(promise).rejects.toMatchObject({
        name: "ApiError",
        code: "HOSPITAL_400",
        result: { errors: [{ field }] },
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("경계값 radius 1·30, limit 1·20은 통과한다", async () => {
    const api = await loadMockApi();

    // radius 1km 안에는 병원이 없어 빈 결과(S05c)가 된다.
    await expect(
      api.searchHospitals({ regionCode: "51720", radius: 1 }),
    ).resolves.toMatchObject({ kind: "empty", result: { radiusKm: 1 } });
    await expect(
      api.searchHospitals({ regionCode: "51720", radius: 30 }),
    ).resolves.toMatchObject({ kind: "found", result: { radiusKm: 30 } });
    await expect(
      api.searchHospitals({ regionCode: "51720", limit: 1 }),
    ).resolves.toMatchObject({ kind: "found" });
    await expect(
      api.searchHospitals({ regionCode: "51720", limit: 20 }),
    ).resolves.toMatchObject({ kind: "found" });
  });

  it("생략하면 기본값(10km, 3곳)으로 통과한다", async () => {
    const api = await loadMockApi();

    await expect(
      api.searchHospitals({ regionCode: "51720" }),
    ).resolves.toMatchObject({
      kind: "found",
      result: { radiusKm: 10 },
    });
  });

  it("위치가 없으면 범위 검사보다 location 오류(needsRegion)가 먼저다", async () => {
    const api = await loadMockApi();

    await expect(api.searchHospitals({ radius: 99 })).resolves.toMatchObject({
      kind: "needsRegion",
    });
  });

  it("limit만큼만 돌려주고 totalCount는 반경 안 전체 수다", async () => {
    const api = await loadMockApi();

    const outcome = await api.searchHospitals({
      latitude: 37.7,
      longitude: 127.9,
      limit: 2,
    });

    expect(outcome.kind).toBe("found");
    if (outcome.kind !== "found") return;
    expect(outcome.result.hospitals).toHaveLength(2);
    expect(outcome.result.totalCount).toBe(3);
  });

  it("가까운 보건소를 돌려주고 위치가 없으면 400이다", async () => {
    const api = await loadMockApi();

    const result = await api.getNearestHealthCenter({ regionCode: "51720" });
    expect(result.hospital?.name).toContain("OO");
    expect(result.hospital?.phoneNumber).toBe("000-0000-0000");

    await expect(api.getNearestHealthCenter()).rejects.toMatchObject({
      code: "HOSPITAL_400",
    });
  });

  it("시·군 18곳을 가나다순으로 돌려주고 한 번 만든 목록을 다시 쓴다", async () => {
    const api = await loadMockApi();

    const { regions } = await api.getRegions();

    expect(regions).toHaveLength(18);
    const names = regions.map((item) => item.regionName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "ko")));
    expect(names).toContain("홍천군");
    expect(new Set(regions.map((item) => item.regionCode)).size).toBe(18);
    const again = await api.getRegions();
    expect(again).toEqual({ regions });
    expect(again.regions).not.toBe(regions);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// mock 분기도 실제 fetch처럼 이미 취소된 signal이면 아무 일도 하지 않고 AbortError로 reject합니다.
describe("가짜 응답의 취소", () => {
  const intakeId = "3f2a9c1e-0000-4000-8000-000000000001";
  const summaryId = "8b1d2e3f-0000-4000-8000-000000000001";

  function abortedSignal() {
    const controller = new AbortController();
    controller.abort();
    return controller.signal;
  }

  const calls: [
    string,
    (api: MockApi, signal: AbortSignal) => Promise<unknown>,
  ][] = [
    ["startIntake", (api, signal) => api.startIntake(buttonStart, signal)],
    ["getIntake", (api, signal) => api.getIntake(intakeId, signal)],
    [
      "answerIntake",
      (api, signal) =>
        api.answerIntake(
          intakeId,
          { questionId: "q", inputMode: "BUTTON", answer: "YES" },
          signal,
        ),
    ],
    ["goBackIntake", (api, signal) => api.goBackIntake(intakeId, signal)],
    ["cancelIntake", (api, signal) => api.cancelIntake(intakeId, signal)],
    [
      "getIntakeDepartment",
      (api, signal) => api.getIntakeDepartment(intakeId, signal),
    ],
    ["getSummary", (api, signal) => api.getSummary(summaryId, signal)],
    [
      "updateSummary",
      (api, signal) =>
        api.updateSummary(summaryId, { mainSymptom: "OO" }, signal),
    ],
    ["confirmSummary", (api, signal) => api.confirmSummary(summaryId, signal)],
    ["retrySummary", (api, signal) => api.retrySummary(intakeId, signal)],
    [
      "searchHospitals",
      (api, signal) => api.searchHospitals({ regionCode: "51720" }, signal),
    ],
    [
      "getNearestHealthCenter",
      (api, signal) =>
        api.getNearestHealthCenter({ regionCode: "51720" }, signal),
    ],
  ];

  // 없는 ID를 쓰므로 취소를 확인하지 않으면 404 같은 다른 오류가 나서 구분됩니다.
  it.each(calls)(
    "%s는 취소된 signal이면 AbortError로 reject한다",
    async (_n, call) => {
      const api = await loadMockApi();

      await expect(call(api, abortedSignal())).rejects.toMatchObject({
        name: "AbortError",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("취소된 startIntake는 문진을 만들지 않는다", async () => {
    const api = await loadMockApi();

    await expect(
      api.startIntake(buttonStart, abortedSignal()),
    ).rejects.toMatchObject({ name: "AbortError" });
    const started = await api.startIntake(buttonStart);

    // 취소된 호출이 번호를 쓰지 않았다면 첫 문진 번호다.
    expect(started.intakeId).toBe(intakeId);
  });

  it("취소된 답변은 답을 저장하지 않는다", async () => {
    const api = await loadMockApi();
    const started = await api.startIntake(buttonStart);
    const question = started.question!;

    await expect(
      api.answerIntake(
        started.intakeId,
        {
          questionId: question.questionId,
          inputMode: "BUTTON",
          answer: question.options![0].code,
        },
        abortedSignal(),
      ),
    ).rejects.toMatchObject({ name: "AbortError" });

    await expect(api.getIntake(started.intakeId)).resolves.toEqual(started);
  });
});
