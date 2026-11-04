import { ApiError, INVALID_RESPONSE, isApiError } from "@/api/errors";
import { recognizeSpeech } from "@/api/stt";
import type { VoiceRecording } from "@/lib/voice/recorder";
import {
  getSttFailure,
  reaskFailure,
  type SttFailure,
} from "@/lib/voice/sttFailure";

export type TranscribeResult =
  // 인식한 글자입니다. 문진 시작·답변에 inputMode=VOICE로 보냅니다.
  | { kind: "text"; text: string }
  | { kind: "failed"; failure: SttFailure }
  // 호출한 쪽이 취소했습니다(화면을 떠남). 안내하지 않습니다.
  | { kind: "aborted" };

// 녹음을 서버로 올려 글자로 받습니다. 녹음(Blob)은 이 함수 안에서만 쓰고 어디에도 남기지 않습니다.
// 올리고 나면 호출한 쪽도 recording을 버리면 가비지 컬렉션 대상이 됩니다.
export async function transcribeRecording(
  recording: VoiceRecording,
  signal?: AbortSignal,
): Promise<TranscribeResult> {
  try {
    const { text } = await recognizeSpeech(recording.blob, signal);
    if (signal?.aborted) return { kind: "aborted" };
    // 응답 형식이 계약과 다르면(text가 글자가 아님) 서버 오류로 안내합니다.
    if (typeof text !== "string") {
      return {
        kind: "failed",
        failure: getSttFailure(new ApiError(INVALID_RESPONSE, "", 200)),
      };
    }
    // 서버는 알아듣지 못하면 STT_422를 주지만, 빈 글자가 오면 답으로 보낼 수 없으니 같은 안내를 합니다.
    const trimmed = text.trim();
    if (trimmed === "") return { kind: "failed", failure: reaskFailure };
    return { kind: "text", text: trimmed };
  } catch (error) {
    if (signal?.aborted) return { kind: "aborted" };
    // 코드 실수(ApiError가 아닌 오류)는 서버 오류 안내로 숨기지 않고 그대로 던집니다.
    if (!isApiError(error)) throw error;
    return { kind: "failed", failure: getSttFailure(error) };
  }
}
