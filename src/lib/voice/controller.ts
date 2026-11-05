import {
  isVoiceRecorderError,
  startRecording,
  VoiceRecorderError,
  type RecordingSession,
  type VoiceRecording,
} from "@/lib/voice/recorder";

export type VoiceRecorderStatus =
  // 마이크를 쓰고 있지 않습니다.
  | "idle"
  // 마이크 권한 창이 떠 있거나 마이크를 켜는 중입니다.
  | "starting"
  // 듣는 중입니다.
  | "recording";

export interface VoiceRecorderSnapshot {
  status: VoiceRecorderStatus;
  // 마지막 시도가 실패한 이유입니다. 다시 시작하면 지워집니다.
  error: VoiceRecorderError | null;
}

const idleSnapshot: VoiceRecorderSnapshot = { status: "idle", error: null };

// 녹음 한 번의 수명(시작 중 → 듣는 중 → 끝)을 관리합니다. React 밖에서 테스트할 수 있게 분리했습니다.
// 받은 녹음(Blob)은 onRecorded에만 넘기고 여기에는 남기지 않습니다.
export class VoiceRecordingController {
  private snapshot = idleSnapshot;
  private readonly listeners = new Set<() => void>();
  private abort: AbortController | null = null;
  private session: RecordingSession | null = null;

  // 녹음이 끝났을 때(사용자가 멈췄거나 시간·크기 상한에서 멈춘 경우) 한 번 불립니다.
  constructor(private onRecorded: (recording: VoiceRecording) => void) {}

  // 화면이 다시 그려질 때마다 새 콜백으로 바꿔 둘 수 있게 합니다.
  setOnRecorded = (onRecorded: (recording: VoiceRecording) => void): void => {
    this.onRecorded = onRecorded;
  };

  getSnapshot = (): VoiceRecorderSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(patch: Partial<VoiceRecorderSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  // iOS 사파리는 사용자 동작(탭) 안에서 마이크를 켜야 하므로 버튼 핸들러에서 바로 부릅니다.
  start = async (): Promise<void> => {
    // 권한 창이 떠 있거나 이미 녹음 중이면 두 번째 녹음을 시작하지 않습니다.
    if (this.abort) return;
    const abort = new AbortController();
    this.abort = abort;
    this.update({ status: "starting", error: null });
    // 취소되면 null로 남습니다.
    let recording: VoiceRecording | null = null;
    try {
      const session = await startRecording({ signal: abort.signal });
      if (abort.signal.aborted) {
        // 마이크가 켜지는 사이에 취소되었습니다.
        session.cancel();
      } else {
        this.session = session;
        this.update({ status: "recording" });
      }
      recording = await session.result;
    } catch (caught) {
      // 취소는 오류가 아닙니다.
      if (!abort.signal.aborted) {
        this.update({
          error: isVoiceRecorderError(caught)
            ? caught
            : new VoiceRecorderError("failed", "녹음에 실패했어요.", caught),
        });
      }
    } finally {
      // 취소한 뒤 바로 새로 시작했다면 새 녹음의 상태를 건드리지 않습니다.
      if (this.abort === abort) {
        this.abort = null;
        this.session = null;
        this.update({ status: "idle" });
      }
    }
    // 콜백의 오류가 녹음 실패로 바뀌지 않도록 try 밖에서 부릅니다.
    if (recording && !abort.signal.aborted) this.onRecorded(recording);
  };

  // 지금까지의 녹음을 onRecorded로 넘기며 끝냅니다.
  stop = (): void => {
    this.session?.stop();
  };

  // 마이크를 바로 놓고 녹음을 버립니다. 시작 중(권한 창)이어도 켜지는 즉시 놓습니다.
  // 바로 이어서 start를 불러도 됩니다. 취소된 시작은 새 녹음의 상태를 건드리지 않습니다.
  cancel = (): void => {
    const { abort, session } = this;
    if (!abort) return;
    this.abort = null;
    this.session = null;
    abort.abort();
    session?.cancel();
    this.update({ status: "idle" });
  };

  clearError = (): void => {
    if (this.snapshot.error) this.update({ error: null });
  };
}
