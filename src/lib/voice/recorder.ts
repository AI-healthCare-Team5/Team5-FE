import {
  AUTO_STOP_MS,
  MAX_RECORDING_BYTES,
  RECORDER_TIMESLICE_MS,
  STOP_TIMEOUT_MS,
} from "@/lib/voice/limits";
import {
  isAcceptedAudioType,
  pickRecorderMimeType,
} from "@/lib/voice/mimeType";

// 녹음은 Blob 하나로 메모리에만 둡니다.
// 저장소(localStorage, IndexedDB, Cache)에 쓰거나 object URL을 만들지 않고,
// 끝나거나 취소되면 마이크 스트림의 트랙을 모두 멈추고 쌓아 둔 조각을 버립니다.

export type VoiceRecorderErrorKind =
  // 이 브라우저·주소(HTTPS가 아님 등)에서는 녹음할 수 없거나 서버가 받는 형식을 만들 수 없습니다.
  | "unsupported"
  // 마이크 사용을 거부했습니다.
  | "permission-denied"
  // 쓸 수 있는 마이크가 없습니다.
  | "no-device"
  // 녹음 중에 마이크가 끊기거나 화면이 백그라운드로 가서 녹음을 버렸습니다.
  | "interrupted"
  | "failed";

export class VoiceRecorderError extends Error {
  readonly kind: VoiceRecorderErrorKind;

  constructor(kind: VoiceRecorderErrorKind, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "VoiceRecorderError";
    this.kind = kind;
  }
}

export function isVoiceRecorderError(
  error: unknown,
): error is VoiceRecorderError {
  return error instanceof VoiceRecorderError;
}

export type RecordingEndReason = "user" | "max-duration" | "max-size";

export interface VoiceRecording {
  blob: Blob;
  // 실제로 녹음된 형식입니다. 예: audio/webm;codecs=opus, audio/mp4
  mimeType: string;
  durationMs: number;
  // 사용자가 멈췄는지, 시간·크기 상한에서 멈췄는지입니다.
  reason: RecordingEndReason;
}

export interface RecordingSession {
  // 녹음이 끝나면 결과로 이행합니다. cancel하면 null로 이행하고,
  // 녹음이 끊기거나 실패하면 VoiceRecorderError로 거절합니다.
  readonly result: Promise<VoiceRecording | null>;
  // 녹음을 멈추고 지금까지의 녹음을 result로 돌려줍니다.
  stop(): void;
  // 녹음을 버립니다. 마이크를 바로 놓고 result는 null로 이행합니다.
  cancel(): void;
}

export interface StartRecordingOptions {
  // 마이크 권한 창이 떠 있는 동안 화면을 떠난 경우처럼 시작 도중에 취소할 때 씁니다.
  signal?: AbortSignal;
}

function createAbortError(): DOMException {
  return new DOMException("녹음을 취소했어요.", "AbortError");
}

function stopTracks(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

// getUserMedia가 던지는 DOMException을 화면이 분기할 수 있는 종류로 바꿉니다.
function toRecorderError(error: unknown): VoiceRecorderError {
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
    case "PermissionDeniedError":
      return new VoiceRecorderError(
        "permission-denied",
        "마이크 사용이 허용되지 않았어요.",
        error,
      );
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return new VoiceRecorderError(
        "no-device",
        "사용할 수 있는 마이크가 없어요.",
        error,
      );
    default:
      return new VoiceRecorderError("failed", "마이크를 켜지 못했어요.", error);
  }
}

// 권한 창을 띄우기 전에, 녹음이 가능한 환경인지와 서버가 받는 형식을 만들 수 있는지 확인합니다.
// 가능하면 MediaRecorder에 요청할 형식을 돌려줍니다. 형식 지원 여부를 물을 수 없는 브라우저는 undefined입니다.
function checkRecordable(): string | undefined {
  // HTTPS가 아닌 주소(localhost 제외)에서는 navigator.mediaDevices가 없습니다.
  if (
    typeof navigator === "undefined" ||
    typeof navigator.mediaDevices?.getUserMedia !== "function" ||
    typeof MediaRecorder === "undefined"
  ) {
    throw new VoiceRecorderError(
      "unsupported",
      "이 브라우저에서는 녹음할 수 없어요.",
    );
  }
  if (typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }
  const mimeType = pickRecorderMimeType((type) =>
    MediaRecorder.isTypeSupported(type),
  );
  if (!mimeType) {
    throw new VoiceRecorderError(
      "unsupported",
      "이 브라우저는 서버가 받는 녹음 형식을 지원하지 않아요.",
    );
  }
  return mimeType;
}

// 마이크를 켜고 녹음을 시작합니다. iOS 사파리는 사용자 동작(탭) 안에서 불러야 권한 창이 뜹니다.
export async function startRecording(
  options: StartRecordingOptions = {},
): Promise<RecordingSession> {
  const { signal } = options;
  if (signal?.aborted) throw createAbortError();
  const requestedType = checkRecordable();

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    throw toRecorderError(error);
  }
  // 권한 창이 떠 있는 동안 취소되었다면 켜진 마이크를 바로 놓습니다.
  if (signal?.aborted) {
    stopTracks(stream);
    throw createAbortError();
  }

  let recorder: MediaRecorder;
  try {
    recorder = requestedType
      ? new MediaRecorder(stream, { mimeType: requestedType })
      : new MediaRecorder(stream);
  } catch (error) {
    stopTracks(stream);
    throw new VoiceRecorderError(
      "unsupported",
      "녹음기를 만들지 못했어요.",
      error,
    );
  }
  // 브라우저가 실제로 고른 형식이 서버가 받는 형식인지 한 번 더 확인합니다.
  const mimeType = recorder.mimeType || requestedType || "";
  if (!isAcceptedAudioType(mimeType)) {
    stopTracks(stream);
    throw new VoiceRecorderError(
      "unsupported",
      "이 브라우저의 녹음 형식은 서버가 받지 않아요.",
    );
  }

  return createSession(stream, recorder, mimeType);
}

function createSession(
  stream: MediaStream,
  recorder: MediaRecorder,
  mimeType: string,
): RecordingSession {
  const startedAt = Date.now();
  const tracks = stream.getTracks();
  let chunks: Blob[] = [];
  let totalBytes = 0;
  let sizeLimitHit = false;
  let endReason: RecordingEndReason | null = null;
  let settled = false;
  let stopTimer: ReturnType<typeof setTimeout> | undefined;
  let resolveResult!: (recording: VoiceRecording | null) => void;
  let rejectResult!: (error: VoiceRecorderError) => void;
  const result = new Promise<VoiceRecording | null>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  function onData(event: Event) {
    const { data } = event as BlobEvent;
    // 상한을 넘은 뒤의 조각은 앞 조각과 이어지지 않으므로 모두 버립니다.
    if (sizeLimitHit || data.size === 0) return;
    if (totalBytes + data.size > MAX_RECORDING_BYTES) {
      sizeLimitHit = true;
      requestStop("max-size");
      return;
    }
    chunks.push(data);
    totalBytes += data.size;
  }

  function onStopped() {
    if (settled) return;
    const blob = new Blob(chunks, { type: mimeType });
    if (blob.size === 0) {
      fail("failed", "녹음된 소리가 없어요.");
      return;
    }
    const recording: VoiceRecording = {
      blob,
      mimeType,
      durationMs: Date.now() - startedAt,
      reason: sizeLimitHit ? "max-size" : (endReason ?? "user"),
    };
    settled = true;
    release();
    resolveResult(recording);
  }

  function onRecorderError() {
    fail("failed", "녹음 중 오류가 생겼어요.");
  }

  // 장치를 뺐거나 권한을 회수해서 마이크가 끊긴 경우입니다. 끊긴 녹음은 쓰지 않습니다.
  function onTrackEnded() {
    fail("interrupted", "마이크가 끊겼어요.");
  }

  // 화면이 백그라운드로 가면 마이크를 붙잡고 있지 않도록 녹음을 버립니다.
  function onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      fail("interrupted", "화면이 닫혀서 녹음을 멈췄어요.");
    }
  }

  function onPageHide() {
    fail("interrupted", "화면이 닫혀서 녹음을 멈췄어요.");
  }

  function addListeners() {
    recorder.addEventListener("dataavailable", onData);
    recorder.addEventListener("stop", onStopped);
    recorder.addEventListener("error", onRecorderError);
    tracks.forEach((track) => track.addEventListener("ended", onTrackEnded));
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", onPageHide);
    }
  }

  // 타이머·이벤트·마이크·쌓아 둔 조각을 모두 놓습니다. 여러 번 불러도 됩니다.
  function release() {
    clearTimeout(limitTimer);
    clearTimeout(stopTimer);
    recorder.removeEventListener("dataavailable", onData);
    recorder.removeEventListener("stop", onStopped);
    recorder.removeEventListener("error", onRecorderError);
    tracks.forEach((track) => track.removeEventListener("ended", onTrackEnded));
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", onPageHide);
    }
    if (recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // 이미 멈춘 녹음기입니다. 마이크는 아래에서 놓습니다.
      }
    }
    stopTracks(stream);
    chunks = [];
    totalBytes = 0;
  }

  function fail(kind: VoiceRecorderErrorKind, message: string) {
    if (settled) return;
    settled = true;
    release();
    rejectResult(new VoiceRecorderError(kind, message));
  }

  function requestStop(reason: RecordingEndReason) {
    if (settled || endReason) return;
    endReason = reason;
    clearTimeout(limitTimer);
    if (recorder.state === "inactive") {
      onStopped();
      return;
    }
    // stop 이벤트가 오지 않으면 마이크를 붙잡고 있지 않도록 포기합니다.
    stopTimer = setTimeout(
      () => fail("failed", "녹음을 끝내지 못했어요."),
      STOP_TIMEOUT_MS,
    );
    try {
      recorder.stop();
    } catch {
      fail("failed", "녹음을 끝내지 못했어요.");
    }
  }

  // 상한에 닿으면 스스로 멈춥니다. 시작에 실패해도 release가 이 타이머를 지웁니다.
  const limitTimer = setTimeout(
    () => requestStop("max-duration"),
    AUTO_STOP_MS,
  );
  addListeners();
  try {
    recorder.start(RECORDER_TIMESLICE_MS);
  } catch (error) {
    settled = true;
    release();
    throw new VoiceRecorderError("failed", "녹음을 시작하지 못했어요.", error);
  }
  return {
    result,
    stop() {
      requestStop("user");
    },
    cancel() {
      if (settled) return;
      settled = true;
      release();
      resolveResult(null);
    },
  };
}
