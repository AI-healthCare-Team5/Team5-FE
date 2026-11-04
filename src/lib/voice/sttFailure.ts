import { isApiError, SERVER_ERROR_MESSAGE } from "@/api/errors";
import { REASK_MESSAGE } from "@/stores/intakeFlow";

// POST /api/stt가 실패했을 때 화면이 보여 줄 안내와 다음 행동입니다.
// 이슈 #28의 STT 오류 항목을 따릅니다. code는 {도메인}_{HTTP 상태}이고 도메인은 STT입니다(STT_422, STT_503).
export type SttFailureKind =
  // 400: 녹음을 다시 합니다.
  | "record-again"
  // 413: 더 짧게 말합니다.
  | "too-large"
  // 415·503: 음성 인식을 쓸 수 없으니 글로 입력하게 안내합니다.
  | "use-text"
  // 422: 못 알아들었으니 다시 말합니다. 문진 응답의 reask: true와 같은 안내입니다.
  | "not-understood"
  // 그 밖의 서버·네트워크 오류: 잠시 뒤 다시 시도합니다.
  | "retry";

export interface SttFailure {
  kind: SttFailureKind;
  message: string;
  // true면 음성으로 계속하기 어려우니 "글로 입력하기"를 눈에 띄게 안내합니다.
  suggestTextInput: boolean;
}

const failures: Record<SttFailureKind, SttFailure> = {
  "record-again": {
    kind: "record-again",
    message: "녹음이 잘 되지 않았어요. 다시 녹음해 주세요.",
    suggestTextInput: false,
  },
  "too-large": {
    kind: "too-large",
    message: "녹음이 너무 길어요. 짧게 말씀해 주세요.",
    suggestTextInput: false,
  },
  "use-text": {
    kind: "use-text",
    message: "지금은 말씀을 글자로 바꿀 수 없어요. 글로 입력해 주세요.",
    suggestTextInput: true,
  },
  "not-understood": {
    kind: "not-understood",
    message: REASK_MESSAGE,
    suggestTextInput: false,
  },
  retry: {
    kind: "retry",
    message: SERVER_ERROR_MESSAGE,
    suggestTextInput: false,
  },
};

const STT_CODE = /^STT_(\d{3})$/;

const kindByStatus: Partial<Record<number, SttFailureKind>> = {
  400: "record-again",
  413: "too-large",
  415: "use-text",
  422: "not-understood",
  503: "use-text",
};

export function getSttFailure(error: unknown): SttFailure {
  const status = isApiError(error)
    ? Number(STT_CODE.exec(error.code)?.[1])
    : NaN;
  return failures[kindByStatus[status] ?? "retry"];
}

// 문진 응답(answers)이 reask: true로 돌아왔을 때 보여 줄 안내입니다.
export const reaskFailure: SttFailure = failures["not-understood"];
