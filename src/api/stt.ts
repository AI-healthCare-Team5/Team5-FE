import { apiRequest, isMockApi } from "@/api/client";
import * as mock from "@/api/mockApi";
import { toBaseMimeType } from "@/lib/voice/mimeType";

// POST /api/stt의 응답입니다. 백엔드 SttResponse(Team5-BE develop)와 같은 모양입니다.
export interface SttResult {
  // 인식한 글자입니다. 문진 시작·답변에 inputMode=VOICE로 보냅니다.
  text: string;
  // 녹음 길이(초)입니다.
  durationSec: number;
}

// 서버가 파일 이름의 확장자로도 형식을 가릴 수 있어 형식에 맞는 이름을 붙입니다.
const fileNames: Record<string, string> = {
  "audio/webm": "audio.webm",
  "audio/mp4": "audio.m4a",
};

// 녹음 파일을 글자로 바꿉니다. 파일은 multipart의 audio 부분으로만 올리고, 서버는 저장하지 않습니다.
// 실패하면 STT_400(파일 없음)·413(10MB·60초 초과)·415(지원하지 않는 형식)·422(알아들을 수 없음)·429(호출 제한)·503(인식 서비스 실패)을
// ApiError로 던집니다. 화면 안내는 src/lib/voice/sttFailure.ts가 정합니다.
export async function recognizeSpeech(
  audio: Blob,
  signal?: AbortSignal,
): Promise<SttResult> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.recognizeSpeech(audio);
  }
  // 브라우저가 붙인 codecs 같은 파라미터는 떼고 형식만 보냅니다. 서버가 형식 문자열을 그대로 비교할 때를 대비합니다.
  const type = toBaseMimeType(audio.type);
  const form = new FormData();
  form.append("audio", new Blob([audio], { type }), fileNames[type] ?? "audio");
  return apiRequest<SttResult>("/stt", { method: "POST", body: form, signal });
}
