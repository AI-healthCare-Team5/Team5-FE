import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceRecordingController } from "@/lib/voice/controller";
import {
  FakeMediaRecorder,
  FakeStream,
  installFakeMedia,
} from "@/lib/voice/fakeMedia";
import type { VoiceRecording } from "@/lib/voice/recorder";

// 마이크·녹음 데이터는 모두 가짜입니다.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function setup() {
  const onRecorded = vi.fn<(recording: VoiceRecording) => void>();
  const controller = new VoiceRecordingController(onRecorded);
  return { controller, onRecorded };
}

// start()가 마이크를 켜고 "듣는 중"이 될 때까지 기다립니다.
async function startAndListen(controller: VoiceRecordingController) {
  const finished = controller.start();
  await vi.advanceTimersByTimeAsync(0);
  expect(controller.getSnapshot().status).toBe("recording");
  return { finished };
}

describe("VoiceRecordingController", () => {
  it("시작 중 → 듣는 중 → 멈춤 순서로 바뀌고 녹음은 한 번만 넘긴다", async () => {
    const media = installFakeMedia();
    const { controller, onRecorded } = setup();
    const statuses: string[] = [];
    controller.subscribe(() => statuses.push(controller.getSnapshot().status));

    const { finished } = await startAndListen(controller);
    controller.stop();
    await finished;

    expect(statuses).toEqual(["starting", "recording", "idle"]);
    expect(onRecorded).toHaveBeenCalledTimes(1);
    expect(onRecorded.mock.calls[0][0].blob.size).toBe(100);
    expect(controller.getSnapshot()).toEqual({ status: "idle", error: null });
    expect(media.stream.allStopped).toBe(true);
    expect(media.leftoverListeners).toBe(0);
  });

  it("상태가 바뀌지 않으면 같은 스냅샷 객체를 돌려준다", () => {
    installFakeMedia();
    const { controller } = setup();

    expect(controller.getSnapshot()).toBe(controller.getSnapshot());
  });

  it("시작 중이거나 듣는 중에 다시 시작해도 마이크를 한 번만 켠다", async () => {
    const media = installFakeMedia();
    const { controller } = setup();

    const first = controller.start();
    await controller.start();
    await vi.advanceTimersByTimeAsync(0);
    await controller.start();
    controller.stop();
    await first;

    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
    expect(FakeMediaRecorder.instances).toHaveLength(1);
  });

  it("시간 상한에서 멈추면 사용자가 멈춘 것과 같이 녹음을 넘기고 마이크를 놓는다", async () => {
    const media = installFakeMedia();
    const { controller, onRecorded } = setup();

    const { finished } = await startAndListen(controller);
    await vi.advanceTimersByTimeAsync(60 * 1000);
    await finished;

    expect(onRecorded).toHaveBeenCalledTimes(1);
    expect(onRecorded.mock.calls[0][0].reason).toBe("max-duration");
    expect(controller.getSnapshot().status).toBe("idle");
    expect(media.stream.allStopped).toBe(true);
  });

  it("마이크를 거부하면 오류만 남기고 녹음을 넘기지 않으며, 다시 시작하면 오류가 지워진다", async () => {
    let denied = true;
    const stream = new FakeStream();
    const media = installFakeMedia({
      stream,
      getUserMedia: async () => {
        if (denied) throw new DOMException("가짜 거부", "NotAllowedError");
        return stream;
      },
    });
    const { controller, onRecorded } = setup();

    await controller.start();

    expect(controller.getSnapshot().status).toBe("idle");
    expect(controller.getSnapshot().error?.kind).toBe("permission-denied");
    expect(onRecorded).not.toHaveBeenCalled();

    denied = false;
    const second = controller.start();
    expect(controller.getSnapshot().error).toBeNull();
    await vi.advanceTimersByTimeAsync(0);
    controller.stop();
    await second;

    expect(onRecorded).toHaveBeenCalledTimes(1);
    expect(media.getUserMedia).toHaveBeenCalledTimes(2);
  });

  it("clearError는 오류가 있을 때만 알린다", async () => {
    installFakeMedia({
      getUserMedia: async () => {
        throw new DOMException("가짜 거부", "NotAllowedError");
      },
    });
    const { controller } = setup();
    await controller.start();
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.clearError();
    controller.clearError();

    expect(controller.getSnapshot().error).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("듣는 중에 취소하면 바로 idle이 되고 마이크를 놓으며 녹음도 오류도 남기지 않는다", async () => {
    const media = installFakeMedia();
    const { controller, onRecorded } = setup();

    const { finished } = await startAndListen(controller);
    controller.cancel();

    expect(controller.getSnapshot()).toEqual({ status: "idle", error: null });
    expect(media.stream.allStopped).toBe(true);
    await finished;
    expect(onRecorded).not.toHaveBeenCalled();
    expect(controller.getSnapshot().error).toBeNull();
    expect(media.leftoverListeners).toBe(0);
  });

  it("취소할 것이 없으면 아무 일도 하지 않고 알리지도 않는다", () => {
    installFakeMedia();
    const { controller } = setup();
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.cancel();
    controller.stop();

    expect(listener).not.toHaveBeenCalled();
  });

  it("권한 창이 떠 있는 동안 화면을 떠나면 뒤늦게 켜진 마이크를 바로 놓는다", async () => {
    let grant!: (stream: FakeStream) => void;
    const media = installFakeMedia({
      getUserMedia: () =>
        new Promise<FakeStream>((resolve) => {
          grant = resolve;
        }),
    });
    const { controller, onRecorded } = setup();

    const finished = controller.start();
    expect(controller.getSnapshot().status).toBe("starting");
    controller.cancel();
    expect(controller.getSnapshot().status).toBe("idle");
    grant(media.stream);
    await finished;

    expect(media.stream.allStopped).toBe(true);
    expect(FakeMediaRecorder.instances).toHaveLength(0);
    expect(onRecorded).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toEqual({ status: "idle", error: null });
  });

  it("취소한 시작이 늦게 끝나도 그 사이에 시작한 새 녹음의 상태를 건드리지 않는다", async () => {
    const grants: Array<(stream: FakeStream) => void> = [];
    const first = new FakeStream();
    const second = new FakeStream();
    const media = installFakeMedia({
      getUserMedia: () =>
        new Promise<FakeStream>((resolve) => {
          grants.push(resolve);
        }),
    });
    const { controller, onRecorded } = setup();

    const oldStart = controller.start();
    controller.cancel();
    const newStart = controller.start();
    expect(media.getUserMedia).toHaveBeenCalledTimes(2);
    // 오래된 요청이 먼저 끝납니다.
    grants[0](first);
    await oldStart;

    expect(first.allStopped).toBe(true);
    expect(controller.getSnapshot().status).toBe("starting");

    grants[1](second);
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getSnapshot().status).toBe("recording");
    expect(second.allStopped).toBe(false);
    controller.stop();
    await newStart;

    expect(onRecorded).toHaveBeenCalledTimes(1);
    expect(second.allStopped).toBe(true);
  });

  it("녹음 중 마이크가 끊기면 녹음을 넘기지 않고 interrupted 오류를 남긴다", async () => {
    const media = installFakeMedia();
    const { controller, onRecorded } = setup();

    const { finished } = await startAndListen(controller);
    media.stream.tracks[0].dispatchEvent(new Event("ended"));
    await finished;

    expect(controller.getSnapshot().status).toBe("idle");
    expect(controller.getSnapshot().error?.kind).toBe("interrupted");
    expect(onRecorded).not.toHaveBeenCalled();
    expect(media.stream.allStopped).toBe(true);
  });

  it("녹음이 끝나는 시점에는 가장 나중에 바꾼 콜백이 불린다", async () => {
    installFakeMedia();
    const { controller, onRecorded } = setup();
    const latest = vi.fn<(recording: VoiceRecording) => void>();

    const { finished } = await startAndListen(controller);
    controller.setOnRecorded(latest);
    controller.stop();
    await finished;

    expect(latest).toHaveBeenCalledTimes(1);
    expect(onRecorded).not.toHaveBeenCalled();
  });

  it("지원하지 않는 환경은 unsupported 오류를 남기고 마이크를 켜지 않는다", async () => {
    const media = installFakeMedia({ supported: [] });
    const { controller } = setup();

    await controller.start();

    expect(controller.getSnapshot().error?.kind).toBe("unsupported");
    expect(media.getUserMedia).not.toHaveBeenCalled();
  });

  it("녹음을 받은 쪽의 오류는 녹음 실패로 바뀌지 않고 그대로 드러난다", async () => {
    const media = installFakeMedia();
    const onRecorded = vi.fn(() => {
      throw new Error("받은 쪽 실수");
    });
    const controller = new VoiceRecordingController(onRecorded);

    const { finished } = await startAndListen(controller);
    const outcome = finished.then(
      () => null,
      (error: unknown) => error,
    );
    controller.stop();

    expect(await outcome).toMatchObject({ message: "받은 쪽 실수" });
    expect(controller.getSnapshot().error).toBeNull();
    expect(media.stream.allStopped).toBe(true);
  });
});
