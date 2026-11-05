// 녹음 형식은 크롬이 webm, 사파리가 mp4(m4a)입니다(이슈 #28).
// 앞쪽이 우선입니다. 크롬·파이어폭스는 webm, 사파리는 mp4가 먼저 지원되는 쪽으로 정해집니다.
const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
] as const;

// 서버가 받는 형식입니다. 파라미터(codecs)를 뗀 값으로 비교합니다.
const ACCEPTED_AUDIO_TYPES: readonly string[] = ["audio/webm", "audio/mp4"];

// 브라우저가 지원하는 첫 번째 후보를 돌려줍니다. 지원하는 후보가 없으면 undefined입니다.
export function pickRecorderMimeType(
  isTypeSupported: (type: string) => boolean,
): string | undefined {
  return RECORDER_MIME_CANDIDATES.find((type) => isTypeSupported(type));
}

// "audio/webm;codecs=opus" → "audio/webm"
export function toBaseMimeType(mimeType: string): string {
  return mimeType.split(";")[0].trim().toLowerCase();
}

export function isAcceptedAudioType(mimeType: string): boolean {
  return ACCEPTED_AUDIO_TYPES.includes(toBaseMimeType(mimeType));
}
