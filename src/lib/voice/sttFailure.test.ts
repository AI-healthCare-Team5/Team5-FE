import { describe, expect, it } from "vitest";
import {
  ApiError,
  INVALID_RESPONSE,
  NETWORK_ERROR,
  SERVER_ERROR_MESSAGE,
} from "@/api/errors";
import { getSttFailure, reaskFailure } from "@/lib/voice/sttFailure";

// 서버 메시지는 가짜 문장입니다.
const sttError = (status: number) =>
  new ApiError(`STT_${status}`, "서버가 보낸 문장", status);

describe("getSttFailure", () => {
  it.each([
    [400, "record-again", false],
    [413, "too-large", false],
    [415, "use-text", true],
    [422, "not-understood", false],
    [503, "use-text", true],
  ] as const)("STT_%i는 %s이고 글 입력 안내는 %s다", (status, kind, text) => {
    const failure = getSttFailure(sttError(status));

    expect(failure.kind).toBe(kind);
    expect(failure.suggestTextInput).toBe(text);
    expect(failure.message).not.toBe("");
  });

  it("422와 문진 응답의 reask는 같은 '다시 말씀해 주세요' 안내다", () => {
    expect(getSttFailure(sttError(422)).message).toBe("다시 말씀해 주세요");
    expect(reaskFailure).toBe(getSttFailure(sttError(422)));
  });

  it("그 밖의 서버·네트워크 오류는 공통 오류 문구로 다시 시도하게 한다", () => {
    const unknown = [
      new ApiError("STT_500", "", 500),
      new ApiError(NETWORK_ERROR, "", 0),
      new ApiError(INVALID_RESPONSE, "", 502),
      new ApiError("AUTH_401", "로그인이 필요해요.", 401),
      new Error("개발자 실수"),
      null,
    ];

    for (const error of unknown) {
      const failure = getSttFailure(error);
      expect(failure.kind).toBe("retry");
      expect(failure.message).toBe(SERVER_ERROR_MESSAGE);
      expect(failure.suggestTextInput).toBe(false);
    }
  });

  it("다른 도메인의 400·413 코드는 STT 오류로 보지 않는다", () => {
    expect(getSttFailure(new ApiError("INTAKE_400", "", 400)).kind).toBe(
      "retry",
    );
    expect(getSttFailure(new ApiError("SUMMARY_422", "", 422)).kind).toBe(
      "retry",
    );
  });
});
