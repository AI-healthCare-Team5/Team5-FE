import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, INVALID_RESPONSE, NETWORK_ERROR } from "@/api/errors";
import { recognizeSpeech } from "@/api/stt";
import type { VoiceRecording } from "@/lib/voice/recorder";
import { transcribeRecording } from "@/lib/voice/transcribe";

vi.mock("@/api/stt", () => ({ recognizeSpeech: vi.fn() }));

// 모든 값은 가짜 데이터입니다.
const sttMock = vi.mocked(recognizeSpeech);
const recording: VoiceRecording = {
  blob: new Blob(["가짜 녹음"], { type: "audio/webm" }),
  mimeType: "audio/webm",
  durationMs: 3000,
  reason: "user",
};

beforeEach(() => {
  sttMock.mockReset();
});

describe("transcribeRecording", () => {
  it("녹음 파일을 올리고 앞뒤 공백을 뺀 글자를 돌려준다", async () => {
    sttMock.mockResolvedValue({ text: "  무릎이 아파요 \n", durationSec: 3 });

    const result = await transcribeRecording(recording);

    expect(result).toEqual({ kind: "text", text: "무릎이 아파요" });
    expect(sttMock.mock.calls[0][0]).toBe(recording.blob);
  });

  it("STT 오류는 code에 맞는 안내로 바꾼다", async () => {
    sttMock.mockRejectedValue(new ApiError("STT_413", "", 413));

    const result = await transcribeRecording(recording);

    expect(result).toMatchObject({
      kind: "failed",
      failure: { kind: "too-large" },
    });
  });

  it.each([
    ["네트워크 오류", new ApiError(NETWORK_ERROR, "", 0)],
    ["형식이 다른 응답", new ApiError(INVALID_RESPONSE, "", 502)],
  ])("%s는 다시 시도 안내로 바꾼다", async (_name, error) => {
    sttMock.mockRejectedValue(error);

    const result = await transcribeRecording(recording);

    expect(result).toMatchObject({
      kind: "failed",
      failure: { kind: "retry" },
    });
  });

  it("글자가 비었거나 글자가 아니면 답으로 쓰지 않는다", async () => {
    sttMock.mockResolvedValueOnce({ text: " ", durationSec: 1 });
    expect(await transcribeRecording(recording)).toMatchObject({
      failure: { kind: "not-understood" },
    });

    sttMock.mockResolvedValueOnce({
      text: undefined,
      durationSec: 1,
    } as unknown as Awaited<ReturnType<typeof recognizeSpeech>>);
    expect(await transcribeRecording(recording)).toMatchObject({
      failure: { kind: "retry" },
    });
  });

  it("취소하면 결과가 늦게 와도 오류로 안내하지 않는다", async () => {
    const controller = new AbortController();
    sttMock.mockImplementation(async () => {
      controller.abort();
      return { text: "무릎이 아파요", durationSec: 3 };
    });

    expect(await transcribeRecording(recording, controller.signal)).toEqual({
      kind: "aborted",
    });

    sttMock.mockImplementation(async () => {
      controller.abort();
      throw new DOMException("취소", "AbortError");
    });
    expect(await transcribeRecording(recording, controller.signal)).toEqual({
      kind: "aborted",
    });
  });

  it("코드 실수(ApiError가 아닌 오류)는 숨기지 않고 던진다", async () => {
    sttMock.mockRejectedValue(new TypeError("개발자 실수"));

    await expect(transcribeRecording(recording)).rejects.toThrow("개발자 실수");
  });
});
