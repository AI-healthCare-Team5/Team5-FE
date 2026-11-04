import { useEffect, useState, useSyncExternalStore } from "react";
import { VoiceRecordingController } from "@/lib/voice/controller";
import type { VoiceRecording } from "@/lib/voice/recorder";

interface UseVoiceRecorderOptions {
  // 녹음이 끝났을 때 한 번 불립니다.
  // 받은 Blob은 올린 뒤 바로 버립니다. 저장하거나 object URL을 만들지 않습니다.
  onRecorded: (recording: VoiceRecording) => void;
}

// 화면이 떠나면(언마운트) 마이크를 놓고 녹음을 버립니다.
export function useVoiceRecorder({ onRecorded }: UseVoiceRecorderOptions) {
  const [controller] = useState(() => new VoiceRecordingController(onRecorded));
  useEffect(() => {
    controller.setOnRecorded(onRecorded);
  });
  useEffect(() => controller.cancel, [controller]);
  const { status, error } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  return {
    status,
    error,
    start: controller.start,
    stop: controller.stop,
    cancel: controller.cancel,
    clearError: controller.clearError,
  };
}
