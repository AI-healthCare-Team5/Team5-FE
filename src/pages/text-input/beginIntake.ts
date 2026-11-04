import {
  ApiError,
  getErrorMessage,
  INVALID_RESPONSE,
  isApiError,
} from "@/api/errors";
import { cancelIntake, startIntake } from "@/api/intakes";
import { beginIntakeSession, readIntakeSession } from "@/stores/intakeSession";
import type {
  ButtonIntakeStartRequest,
  IntakeStartRequest,
} from "@/stores/intakeStart";

// S04에서 "다음"을 누르면 버튼 입력으로, S03에서 첫 증상을 말하면 음성(VOICE) 입력으로 문진을 시작합니다.
// 화면 없이 테스트하려고 React 밖에 둡니다.
export type BeginIntakeResult =
  // 첫 질문을 받았습니다. S04a(글) 또는 S03(말)이 이어서 묻습니다.
  | { kind: "started" }
  // 시작하자마자 위험 신호로 판정됐습니다(더 알려주실 내용 포함). 응급 안내(E01)로 갑니다.
  | { kind: "emergency" }
  // 시작하지 못했습니다. 시작 화면에 머물며 message를 안내하고, 다시 시도하면 재시작합니다.
  | { kind: "failed"; message: string }
  // 호출한 쪽이 취소했습니다(화면을 떠남). 안내하지 않습니다.
  | { kind: "aborted" };

// 서버에서 지워도 되는 문진을 지웁니다. 실패해도 사용자에게 알리지 않습니다(서버가 1시간 뒤에 지웁니다).
function discard(intakeId: string) {
  cancelIntake(intakeId).catch(() => undefined);
}

export async function beginIntake(
  request: IntakeStartRequest,
  signal?: AbortSignal,
): Promise<BeginIntakeResult> {
  let intake;
  try {
    intake = await startIntake(request, signal);
  } catch (error) {
    if (signal?.aborted) return { kind: "aborted" };
    // 응답을 받지 못했거나 서버가 거절한 경우만 안내합니다. 코드 실수는 숨기지 않고 그대로 던집니다.
    if (!isApiError(error)) throw error;
    return { kind: "failed", message: getErrorMessage(error) };
  }

  // 응답이 오기 전에 화면을 떠났다면 만들어진 문진은 쓸 곳이 없으니 지웁니다.
  if (signal?.aborted) {
    discard(intake.intakeId);
    return { kind: "aborted" };
  }

  if (intake.status === "EMERGENCY") {
    return { kind: "emergency" };
  }
  if (intake.status !== "IN_PROGRESS" || !intake.question) {
    // 시작 응답은 질문이 있는 IN_PROGRESS나 EMERGENCY여야 합니다.
    discard(intake.intakeId);
    return {
      kind: "failed",
      message: getErrorMessage(new ApiError(INVALID_RESPONSE, "", 200)),
    };
  }

  // S04로 돌아와 다시 시작한 경우입니다. 먼저 시작한 문진은 쓰지 않으니 지웁니다.
  const previous = readIntakeSession();
  if (previous) discard(previous.intake.intakeId);
  beginIntakeSession(intake);
  return { kind: "started" };
}

export function beginButtonIntake(
  request: ButtonIntakeStartRequest,
  signal?: AbortSignal,
): Promise<BeginIntakeResult> {
  return beginIntake(request, signal);
}

// S03에서 인식한 글자(STT 결과)로 문진을 시작합니다.
export function beginVoiceIntake(
  text: string,
  signal?: AbortSignal,
): Promise<BeginIntakeResult> {
  return beginIntake({ inputMode: "VOICE", text }, signal);
}
