import { vi } from "vitest";

// 테스트 전용 가짜 마이크·녹음기입니다. 앱 코드에서 가져오지 않습니다.
// 이벤트 리스너 수를 세서, 끝난 녹음이 리스너를 남기지 않았는지 확인할 수 있게 합니다.

class CountingTarget extends EventTarget {
  private readonly counts = new Map<string, number>();

  override addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void {
    this.counts.set(type, (this.counts.get(type) ?? 0) + 1);
    super.addEventListener(type, callback, options);
  }

  override removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void {
    this.counts.set(type, Math.max(0, (this.counts.get(type) ?? 0) - 1));
    super.removeEventListener(type, callback, options);
  }

  get listenerCount(): number {
    return [...this.counts.values()].reduce((sum, count) => sum + count, 0);
  }
}

export class FakeTrack extends CountingTarget {
  stopCalls = 0;

  get stopped(): boolean {
    return this.stopCalls > 0;
  }

  stop() {
    this.stopCalls += 1;
  }
}

export class FakeStream {
  constructor(readonly tracks: FakeTrack[] = [new FakeTrack()]) {}

  getTracks() {
    return this.tracks;
  }

  get allStopped(): boolean {
    return this.tracks.every((track) => track.stopped);
  }
}

export class FakeMediaRecorder extends CountingTarget {
  static supported = new Set<string>();
  static instances: FakeMediaRecorder[] = [];
  // mimeType를 지정하지 않았을 때 브라우저가 고르는 형식입니다.
  static defaultType = "audio/webm;codecs=opus";
  // stop() 때 나오는 마지막 조각의 크기입니다.
  static finalChunkBytes = 100;
  // true면 stop()을 불러도 stop 이벤트가 오지 않습니다.
  static swallowStop = false;
  static startError: Error | null = null;

  static isTypeSupported(type: string): boolean {
    return FakeMediaRecorder.supported.has(type);
  }

  static reset(supported: string[]) {
    FakeMediaRecorder.supported = new Set(supported);
    FakeMediaRecorder.instances = [];
    FakeMediaRecorder.defaultType = "audio/webm;codecs=opus";
    FakeMediaRecorder.finalChunkBytes = 100;
    FakeMediaRecorder.swallowStop = false;
    FakeMediaRecorder.startError = null;
  }

  state: "inactive" | "recording" = "inactive";
  readonly mimeType: string;
  timeslice: number | undefined;
  stopCalls = 0;

  constructor(
    readonly stream: FakeStream,
    options?: { mimeType?: string },
  ) {
    super();
    this.mimeType = options?.mimeType ?? FakeMediaRecorder.defaultType;
    FakeMediaRecorder.instances.push(this);
  }

  start(timeslice?: number) {
    if (FakeMediaRecorder.startError) throw FakeMediaRecorder.startError;
    this.state = "recording";
    this.timeslice = timeslice;
  }

  stop() {
    if (this.state === "inactive") {
      throw new DOMException("이미 멈췄어요.", "InvalidStateError");
    }
    this.state = "inactive";
    this.stopCalls += 1;
    if (FakeMediaRecorder.swallowStop) return;
    if (FakeMediaRecorder.finalChunkBytes > 0) {
      this.emitData(FakeMediaRecorder.finalChunkBytes);
    }
    this.dispatchEvent(new Event("stop"));
  }

  emitData(bytes: number) {
    const event = new Event("dataavailable");
    Object.assign(event, { data: new Blob([new Uint8Array(bytes)]) });
    this.dispatchEvent(event);
  }
}

export class FakeDocument extends CountingTarget {
  visibilityState: "visible" | "hidden" = "visible";
}

export function installFakeMedia(
  options: {
    supported?: string[];
    stream?: FakeStream;
    getUserMedia?: () => Promise<FakeStream>;
  } = {},
) {
  FakeMediaRecorder.reset(
    options.supported ?? ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"],
  );
  const stream = options.stream ?? new FakeStream();
  const getUserMedia = vi.fn(options.getUserMedia ?? (async () => stream));
  const fakeDocument = new FakeDocument();
  const fakeWindow = new CountingTarget();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  vi.stubGlobal("document", fakeDocument);
  vi.stubGlobal("window", fakeWindow);
  return {
    stream,
    getUserMedia,
    document: fakeDocument,
    window: fakeWindow,
    get recorder() {
      return FakeMediaRecorder.instances[0];
    },
    // 끝난 녹음이 리스너를 하나도 남기지 않았는지 확인할 때 씁니다.
    get leftoverListeners() {
      return (
        stream.tracks.reduce((sum, track) => sum + track.listenerCount, 0) +
        FakeMediaRecorder.instances.reduce(
          (sum, instance) => sum + instance.listenerCount,
          0,
        ) +
        fakeDocument.listenerCount +
        fakeWindow.listenerCount
      );
    },
  };
}
