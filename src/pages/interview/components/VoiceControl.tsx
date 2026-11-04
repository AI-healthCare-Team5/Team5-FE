import { useEffect, useState } from "react";
import { DesignIcon } from "@/components/DesignIcon";
import { Button } from "@/components/ui";
import type { VoiceRecorderStatus } from "@/lib/voice/controller";
import { MAX_RECORDING_SECONDS } from "@/lib/voice/limits";

// 듣는 중에만 그려서, 시작할 때마다 0초부터 셉니다. 화면 낭독기가 매초 읽지 않도록 라이브 영역 밖에 둡니다.
function RecordingTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const startedAt = performance.now();
    const id = window.setInterval(() => {
      setSeconds(Math.floor((performance.now() - startedAt) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, []);
  const shown = Math.min(seconds, MAX_RECORDING_SECONDS);
  return (
    <p className="text-[0.889rem] text-muted tabular-nums">
      {Math.floor(shown / 60)}:{String(shown % 60).padStart(2, "0")}
    </p>
  );
}

// S03의 마이크 영역입니다. 쉬는 중(누르면 듣기 시작) → 듣는 중(누르면 멈추고 글자로 바꿈) → 글자로 바꾸는 중입니다.
// iOS 사파리는 사용자가 누른 동작 안에서 마이크를 켜야 해서, 버튼의 onClick에서 바로 onStart를 부릅니다.
export function VoiceControl({
  status,
  busy,
  transcribing,
  onStart,
  onStop,
  onCancel,
}: {
  status: VoiceRecorderStatus;
  // 글자로 바꾸거나 문진 요청이 진행 중이면 마이크를 잠급니다.
  busy: boolean;
  transcribing: boolean;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
}) {
  const recording = status === "recording";
  const starting = status === "starting";
  const label = recording ? "말 마치기" : "말하기";
  const guide = recording
    ? "듣고 있어요"
    : starting
      ? "마이크를 켜는 중이에요"
      : transcribing
        ? "글자로 바꾸는 중이에요"
        : busy
          ? "답을 확인하는 중이에요"
          : "버튼을 누르고 말씀해 주세요";
  return (
    <section
      aria-label="음성으로 답하기"
      className="flex flex-col items-center gap-3"
    >
      <p role="status" className="text-center font-bold">
        {guide}
      </p>
      <button
        type="button"
        disabled={busy || starting}
        aria-busy={busy || starting}
        onClick={recording ? onStop : onStart}
        className="flex flex-col items-center gap-[9px] rounded-[36px] text-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className={`grid size-[144px] place-items-center rounded-full bg-brand-soft p-[9px] ${recording ? "voice-start" : ""}`}
        >
          <span className="grid size-full place-items-center rounded-full bg-brand-ring p-[9px]">
            <span className="grid size-full place-items-center rounded-full bg-brand text-white">
              {recording ? (
                <span
                  aria-hidden="true"
                  className="size-[36px] rounded-[8px] bg-white"
                />
              ) : (
                <DesignIcon name="microphone" size={48} />
              )}
            </span>
          </span>
        </span>
        <span className="min-h-[44px] content-center text-[1.111rem] font-bold">
          {label}
        </span>
      </button>
      {recording && (
        <>
          <RecordingTimer />
          <Button variant="quiet" onClick={onCancel}>
            녹음 취소
          </Button>
        </>
      )}
    </section>
  );
}
