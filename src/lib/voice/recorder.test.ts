import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FakeMediaRecorder,
  FakeStream,
  FakeTrack,
  installFakeMedia,
} from "@/lib/voice/fakeMedia";
import {
  AUTO_STOP_MS,
  MAX_RECORDING_BYTES,
  STOP_TIMEOUT_MS,
} from "@/lib/voice/limits";
import {
  startRecording,
  VoiceRecorderError,
  type VoiceRecorderErrorKind,
} from "@/lib/voice/recorder";

// 마이크·녹음 데이터는 모두 가짜입니다.

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("오류가 나지 않았어요");
}

async function expectKind(
  promise: Promise<unknown>,
  kind: VoiceRecorderErrorKind,
) {
  const error = await errorOf(promise);
  expect(error).toBeInstanceOf(VoiceRecorderError);
  expect((error as VoiceRecorderError).kind).toBe(kind);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("시작 전 확인", () => {
  it("HTTPS가 아니어서 mediaDevices가 없으면 권한 창 없이 unsupported다", async () => {
    installFakeMedia();
    vi.stubGlobal("navigator", {});

    await expectKind(startRecording(), "unsupported");
    expect(FakeMediaRecorder.instances).toHaveLength(0);
  });

  it("MediaRecorder가 없으면 마이크를 켜지 않고 unsupported다", async () => {
    const media = installFakeMedia();
    vi.stubGlobal("MediaRecorder", undefined);

    await expectKind(startRecording(), "unsupported");
    expect(media.getUserMedia).not.toHaveBeenCalled();
  });

  it("서버가 받는 형식(webm·mp4)을 지원하지 않으면 권한 창 전에 unsupported다", async () => {
    const media = installFakeMedia({ supported: ["audio/ogg;codecs=opus"] });

    await expectKind(startRecording(), "unsupported");
    expect(media.getUserMedia).not.toHaveBeenCalled();
  });

  it("이미 취소된 신호면 마이크를 켜지 않는다", async () => {
    const media = installFakeMedia();
    const controller = new AbortController();
    controller.abort();

    const error = await errorOf(startRecording({ signal: controller.signal }));

    expect(error).toMatchObject({ name: "AbortError" });
    expect(media.getUserMedia).not.toHaveBeenCalled();
  });
});

describe("형식 협상", () => {
  it("크롬처럼 webm(opus)을 지원하면 webm으로 녹음한다", async () => {
    const media = installFakeMedia();

    const session = await startRecording();

    expect(media.recorder.mimeType).toBe("audio/webm;codecs=opus");
    session.stop();
    const recording = await session.result;
    expect(recording?.mimeType).toBe("audio/webm;codecs=opus");
    expect(recording?.blob.type).toBe("audio/webm;codecs=opus");
  });

  it("사파리처럼 mp4만 지원하면 mp4로 녹음한다", async () => {
    const media = installFakeMedia({ supported: ["audio/mp4"] });

    const session = await startRecording();

    expect(media.recorder.mimeType).toBe("audio/mp4");
    session.stop();
    expect((await session.result)?.blob.type).toBe("audio/mp4");
  });

  it("형식 지원 여부를 물을 수 없는 브라우저는 기본 형식을 쓰되 서버가 받는 형식인지 확인한다", async () => {
    const media = installFakeMedia();
    class LegacyRecorder extends FakeMediaRecorder {}
    Object.defineProperty(LegacyRecorder, "isTypeSupported", {
      value: undefined,
    });
    vi.stubGlobal("MediaRecorder", LegacyRecorder);
    FakeMediaRecorder.defaultType = "audio/mp4";

    const session = await startRecording();

    session.stop();
    expect((await session.result)?.mimeType).toBe("audio/mp4");
    expect(media.stream.allStopped).toBe(true);
  });

  it("브라우저가 서버가 받지 않는 형식(ogg)을 고르면 마이크를 놓고 unsupported다", async () => {
    const media = installFakeMedia();
    class LegacyRecorder extends FakeMediaRecorder {}
    Object.defineProperty(LegacyRecorder, "isTypeSupported", {
      value: undefined,
    });
    vi.stubGlobal("MediaRecorder", LegacyRecorder);
    FakeMediaRecorder.defaultType = "audio/ogg;codecs=opus";

    await expectKind(startRecording(), "unsupported");

    expect(media.stream.allStopped).toBe(true);
  });
});

describe("마이크 오류", () => {
  it.each([
    ["NotAllowedError", "permission-denied"],
    ["SecurityError", "permission-denied"],
    ["NotFoundError", "no-device"],
    ["NotReadableError", "failed"],
  ] as const)("%s는 %s로 분류한다", async (name, kind) => {
    const media = installFakeMedia({
      getUserMedia: async () => {
        throw new DOMException("가짜 오류", name);
      },
    });

    await expectKind(startRecording(), kind);
    expect(FakeMediaRecorder.instances).toHaveLength(0);
    expect(media.stream.allStopped).toBe(false);
  });
});

describe("녹음 수명", () => {
  it("사용자가 멈추면 조각을 모아 Blob을 돌려주고 마이크와 리스너를 모두 놓는다", async () => {
    const media = installFakeMedia();
    const session = await startRecording();
    expect(media.recorder.timeslice).toBeGreaterThan(0);
    expect(media.stream.allStopped).toBe(false);

    media.recorder.emitData(1000);
    media.recorder.emitData(1000);
    await vi.advanceTimersByTimeAsync(5000);
    session.stop();
    const recording = await session.result;

    // 마지막 조각(100바이트)까지 포함합니다.
    expect(recording?.blob.size).toBe(2100);
    expect(recording?.reason).toBe("user");
    expect(recording?.durationMs).toBe(5000);
    expect(media.stream.allStopped).toBe(true);
    expect(media.leftoverListeners).toBe(0);
  });

  it("멈춤을 여러 번 눌러도 녹음기는 한 번만 멈춘다", async () => {
    const media = installFakeMedia();
    const session = await startRecording();

    session.stop();
    session.stop();
    await session.result;
    session.stop();

    expect(media.recorder.stopCalls).toBe(1);
  });

  it("시간 상한 직전까지는 계속 듣다가 상한에서 스스로 멈춘다", async () => {
    const media = installFakeMedia();
    const session = await startRecording();

    await vi.advanceTimersByTimeAsync(AUTO_STOP_MS - 1);
    expect(media.recorder.state).toBe("recording");
    expect(media.stream.allStopped).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const recording = await session.result;

    expect(recording?.reason).toBe("max-duration");
    expect(recording?.durationMs).toBe(AUTO_STOP_MS);
    // 서버의 60초 상한을 넘지 않습니다.
    expect(recording?.durationMs).toBeLessThan(60 * 1000);
    expect(media.stream.allStopped).toBe(true);
    expect(media.leftoverListeners).toBe(0);
  });

  it("쌓인 크기가 상한을 넘기려 하면 그 조각부터 버리고 멈춘다", async () => {
    const media = installFakeMedia();
    FakeMediaRecorder.finalChunkBytes = 1000;
    const session = await startRecording();

    media.recorder.emitData(4_000_000);
    media.recorder.emitData(4_000_000);
    media.recorder.emitData(4_000_000);
    const recording = await session.result;

    expect(recording?.blob.size).toBe(8_000_000);
    expect(recording?.blob.size).toBeLessThanOrEqual(MAX_RECORDING_BYTES);
    expect(recording?.reason).toBe("max-size");
    expect(media.recorder.stopCalls).toBe(1);
    expect(media.stream.allStopped).toBe(true);
    expect(media.leftoverListeners).toBe(0);
  });

  it("취소하면 마이크를 놓고 null을 돌려주며, 이후 도착한 조각은 쓰지 않는다", async () => {
    const media = installFakeMedia();
    const session = await startRecording();
    media.recorder.emitData(1000);

    session.cancel();

    await expect(session.result).resolves.toBeNull();
    expect(media.stream.allStopped).toBe(true);
    expect(media.recorder.state).toBe("inactive");
    expect(media.leftoverListeners).toBe(0);
    // 이미 놓은 뒤에 도착한 조각이 있어도 오류가 나지 않습니다.
    media.recorder.emitData(1000);
    session.stop();
    session.cancel();
    expect(media.recorder.stopCalls).toBe(1);
  });

  it("멈춘 뒤 취소해도 이미 돌려준 결과는 그대로다", async () => {
    installFakeMedia();
    const session = await startRecording();
    session.stop();
    const recording = await session.result;

    session.cancel();

    expect(recording?.blob.size).toBe(100);
  });

  it("들은 소리가 하나도 없으면 failed로 거절한다", async () => {
    const media = installFakeMedia();
    FakeMediaRecorder.finalChunkBytes = 0;
    const session = await startRecording();

    session.stop();

    await expectKind(session.result, "failed");
    expect(media.stream.allStopped).toBe(true);
  });

  it("녹음기를 시작하지 못하면 마이크를 놓고 failed로 던진다", async () => {
    const media = installFakeMedia();
    FakeMediaRecorder.startError = new Error("가짜 시작 오류");

    await expectKind(startRecording(), "failed");

    expect(media.stream.allStopped).toBe(true);
    expect(media.leftoverListeners).toBe(0);
  });

  it("멈춤을 요청했는데 stop 이벤트가 오지 않으면 일정 시간 뒤 마이크를 놓고 failed로 거절한다", async () => {
    const media = installFakeMedia();
    FakeMediaRecorder.swallowStop = true;
    const session = await startRecording();
    const outcome = errorOf(session.result);

    session.stop();
    expect(media.stream.allStopped).toBe(false);
    await vi.advanceTimersByTimeAsync(STOP_TIMEOUT_MS);

    expect(await outcome).toMatchObject({ kind: "failed" });
    expect(media.stream.allStopped).toBe(true);
    expect(media.leftoverListeners).toBe(0);
  });
});

describe("녹음 중 끊김", () => {
  it("마이크 트랙이 끝나면 녹음을 버리고 interrupted로 거절한다", async () => {
    const media = installFakeMedia();
    const session = await startRecording();
    const outcome = errorOf(session.result);

    media.stream.tracks[0].dispatchEvent(new Event("ended"));

    expect(await outcome).toMatchObject({ kind: "interrupted" });
    expect(media.stream.allStopped).toBe(true);
    expect(media.recorder.state).toBe("inactive");
    expect(media.leftoverListeners).toBe(0);
  });

  it("화면이 백그라운드로 가면 마이크를 붙잡지 않고 interrupted로 거절한다", async () => {
    const media = installFakeMedia();
    const session = await startRecording();
    const outcome = errorOf(session.result);

    media.document.visibilityState = "hidden";
    media.document.dispatchEvent(new Event("visibilitychange"));

    expect(await outcome).toMatchObject({ kind: "interrupted" });
    expect(media.stream.allStopped).toBe(true);
    expect(media.leftoverListeners).toBe(0);
  });

  it("화면이 다시 보이는 이벤트에는 녹음을 버리지 않는다", async () => {
    const media = installFakeMedia();
    const session = await startRecording();

    media.document.visibilityState = "visible";
    media.document.dispatchEvent(new Event("visibilitychange"));

    expect(media.recorder.state).toBe("recording");
    expect(media.stream.allStopped).toBe(false);
    session.cancel();
  });

  it("페이지를 떠나면(pagehide) 마이크를 놓는다", async () => {
    const media = installFakeMedia();
    const session = await startRecording();
    const outcome = errorOf(session.result);

    media.window.dispatchEvent(new Event("pagehide"));

    expect(await outcome).toMatchObject({ kind: "interrupted" });
    expect(media.stream.allStopped).toBe(true);
  });

  it("녹음기 오류가 나면 마이크를 놓고 failed로 거절한다", async () => {
    const media = installFakeMedia();
    const session = await startRecording();
    const outcome = errorOf(session.result);

    media.recorder.dispatchEvent(new Event("error"));

    expect(await outcome).toMatchObject({ kind: "failed" });
    expect(media.stream.allStopped).toBe(true);
    expect(media.leftoverListeners).toBe(0);
  });
});

describe("권한 창이 떠 있는 동안 취소", () => {
  it("뒤늦게 켜진 마이크를 바로 놓고 녹음기를 만들지 않는다", async () => {
    let grant!: (stream: FakeStream) => void;
    const media = installFakeMedia({
      getUserMedia: () =>
        new Promise<FakeStream>((resolve) => {
          grant = resolve;
        }),
    });
    const controller = new AbortController();
    const outcome = errorOf(startRecording({ signal: controller.signal }));

    controller.abort();
    const lateStream = new FakeStream([new FakeTrack(), new FakeTrack()]);
    grant(lateStream);

    expect(await outcome).toMatchObject({ name: "AbortError" });
    expect(lateStream.allStopped).toBe(true);
    expect(FakeMediaRecorder.instances).toHaveLength(0);
    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
  });
});
