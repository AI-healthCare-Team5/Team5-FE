import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { DesignIcon } from "@/components/DesignIcon";
import { WarningNotice } from "@/components/WarningNotice";
import { ActionLink, Button, Chip, Notice, PageTitle } from "@/components/ui";
import { beginButtonIntake } from "@/pages/text-input/beginIntake";
import { appActions, useAppStore } from "@/stores/appStore";
import {
  bodyPartOptions,
  createButtonIntakeRequest,
  onsetOptions,
} from "@/stores/intakeStart";

export function TextInputPage() {
  const { interview } = useAppStore();
  const navigate = useNavigate();
  const intakeRequest = createButtonIntakeRequest(interview);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // 같은 순간에 두 번 눌러도 문진을 한 번만 시작하도록 state와 별개로 기억합니다.
  const startingRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);

  // 화면을 떠나면 진행 중인 시작 요청을 취소합니다.
  useEffect(() => () => requestRef.current?.abort(), []);

  async function start() {
    if (!intakeRequest || startingRef.current) {
      return;
    }
    startingRef.current = true;
    const request = new AbortController();
    requestRef.current = request;
    setStarting(true);
    setMessage(null);
    try {
      const result = await beginButtonIntake(intakeRequest, request.signal);
      if (result.kind === "started") {
        navigate("/text-input/questions");
      } else if (result.kind === "emergency") {
        navigate("/emergency");
      } else if (result.kind === "failed") {
        setMessage(result.message);
      }
    } finally {
      startingRef.current = false;
      if (!request.signal.aborted) {
        setStarting(false);
      }
    }
  }
  return (
    <>
      <div className="flex flex-col gap-5">
        <PageTitle>
          버튼을 눌러서
          <br />
          알려주세요
        </PageTitle>
        <Notice>
          <span className="flex items-start gap-3">
            <DesignIcon name="info" size={20} />
            <span className="flex flex-col items-start">
              말하는 게 더 편하면 말로 바꿀 수 있어요
              <Link
                to="/interview"
                className="inline-flex min-h-[44px] items-center font-bold text-brand-strong underline underline-offset-4"
              >
                말로 해 보기
              </Link>
            </span>
          </span>
        </Notice>
      </div>
      <section
        aria-labelledby="text-input-symptom"
        className="flex flex-col gap-3"
      >
        <h2 id="text-input-symptom" className="text-[1.111rem] font-bold">
          어디가 불편하세요?
        </h2>
        <div className="grid grid-cols-2 gap-[10px]">
          {bodyPartOptions.map(({ value, label }) => (
            <Chip
              key={value}
              selected={interview.symptom === label}
              onClick={() => appActions.answer("symptom", label)}
            >
              {label}
            </Chip>
          ))}
        </div>
      </section>
      <section
        aria-labelledby="text-input-duration"
        className="flex flex-col gap-3"
      >
        <h2 id="text-input-duration" className="text-[1.111rem] font-bold">
          언제부터 그러세요?
        </h2>
        <div className="flex flex-col gap-[10px]">
          {onsetOptions.map(({ value, label }) => (
            <Chip
              key={value}
              selected={interview.duration === label}
              onClick={() => appActions.answer("duration", label)}
            >
              {label}
            </Chip>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <label
          htmlFor="text-input-detail"
          className="text-[1.111rem] font-bold"
        >
          더 알려주실 내용이 있나요?
        </label>
        <textarea
          id="text-input-detail"
          value={interview.detail ?? ""}
          onChange={(event) => appActions.answer("detail", event.target.value)}
          placeholder="예) 계단을 오를 때 더 아파요"
          maxLength={200}
          rows={4}
          className="min-h-[7rem] w-full resize-y rounded-[16px] border border-control bg-surface px-4 py-3 placeholder:text-subtle"
        />
      </section>
      <div className="flex flex-col gap-3">
        <p className="text-center text-[0.889rem] text-muted">
          다음 화면에서 나이, 복용약 등 몇 가지만 더 여쭤볼게요.
        </p>
        {message && <WarningNotice>{message}</WarningNotice>}
        <Button
          disabled={!intakeRequest || starting}
          aria-busy={starting}
          onClick={() => void start()}
        >
          다음
        </Button>
        <ActionLink to="/interview" variant="outline">
          <DesignIcon name="microphone" size={20} />
          말로 다시 해 볼게요
        </ActionLink>
      </div>
    </>
  );
}
