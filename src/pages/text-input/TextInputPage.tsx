import { Link, useNavigate } from "react-router";
import { DesignIcon } from "@/components/DesignIcon";
import { ActionLink, Button, Chip, Notice, PageTitle } from "@/components/ui";
import { appActions, useAppStore } from "@/stores/appStore";

const symptoms = [
  "머리",
  "가슴",
  "배",
  "허리",
  "팔 · 어깨",
  "다리 · 무릎",
  "피부",
  "기타",
];
const durations = ["오늘", "2~3일", "일주일 이상"];

export function TextInputPage() {
  const { interview } = useAppStore();
  const navigate = useNavigate();
  const ready = Boolean(interview.symptom && interview.duration);
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
          {symptoms.map((symptom) => (
            <Chip
              key={symptom}
              selected={interview.symptom === symptom}
              onClick={() => appActions.answer("symptom", symptom)}
            >
              {symptom}
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
          {durations.map((duration) => (
            <Chip
              key={duration}
              selected={interview.duration === duration}
              onClick={() => appActions.answer("duration", duration)}
            >
              {duration}
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
          rows={4}
          className="min-h-[7rem] w-full resize-y rounded-[16px] border border-control bg-surface px-4 py-3 placeholder:text-subtle"
        />
      </section>
      <div className="flex flex-col gap-3">
        <p className="text-center text-[0.889rem] text-muted">
          다음 화면에서 나이, 복용약 등 몇 가지만 더 여쭤볼게요.
        </p>
        <Button
          disabled={!ready}
          onClick={() => navigate("/text-input/questions")}
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
