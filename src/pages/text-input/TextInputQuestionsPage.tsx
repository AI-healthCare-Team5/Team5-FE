import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { ActionLink, Button, Chip, Progress } from "@/components/ui";
import { appActions, useAppStore } from "@/stores/appStore";
import { interviewQuestions } from "@/stores/interviewQuestions";

// S04a는 S03의 질문 1·2·5·6·7을 같은 문항과 선택지로 묻습니다.
const textQuestions = interviewQuestions.filter(
  (question) => question.key !== "swelling" && question.key !== "fall",
);

export function TextInputQuestionsPage() {
  const { interview } = useAppStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const total = textQuestions.length;
  const complete = step === total;
  const question = textQuestions[Math.min(step, total - 1)];
  // 같은 답("없어요")이 여러 문항에 나올 수 있어 문항 key로 구분합니다.
  const answers = [
    { key: "symptom", value: interview.symptom },
    { key: "duration", value: interview.duration },
    ...textQuestions.map((item) => ({
      key: item.key,
      value: interview[item.key],
    })),
  ].filter(
    (answer): answer is { key: string; value: string } =>
      Boolean(answer.value) && answer.value !== "잘 모르겠어요",
  );
  // 새로고침이나 주소로 바로 들어와 S04 답이 없으면 S04부터 다시 시작합니다.
  if (!interview.symptom || !interview.duration) {
    return <Navigate to="/text-input" replace />;
  }
  return (
    <>
      <Progress
        current={Math.min(step + 1, total)}
        total={total}
        label={complete ? "문진 완료" : question.group}
      />
      {answers.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[0.889rem] font-medium text-muted">
            지금까지 알려주신 내용
          </p>
          <ul className="flex flex-wrap gap-2">
            {answers.map(({ key, value }) => (
              <li
                key={key}
                className="rounded-full bg-brand-soft px-[14px] py-[6px] text-[0.889rem] font-medium text-brand-strong"
              >
                {value}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <section className="rounded-[24px] bg-ink px-6 pt-6 pb-7 text-white">
          <p className="mb-3 text-[0.889rem] font-bold tracking-[0.3px] text-question-hint">
            {complete ? "알려주신 내용" : "몇 가지만 더 여쭤볼게요"}
          </p>
          <h1
            className="text-[1.444rem] leading-[1.4] font-bold tracking-[-0.5px]"
            aria-live="polite"
          >
            {complete ? "정리했어요" : question.title}
          </h1>
        </section>
        {!complete && (step === 0 || question.description) && (
          <p className="text-[0.889rem] text-muted">
            {step === 0 ? "나이대만 알려 주셔도 돼요" : question.description}
          </p>
        )}
        {complete ? (
          <>
            <p className="text-muted">
              알려주신 내용으로 알맞은 병원을 찾아볼게요.
            </p>
            <ActionLink to="/location">병원 안내 보기</ActionLink>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-[10px]">
              {question.options.map((option) => (
                <Chip
                  key={option}
                  selected={interview[question.key] === option}
                  onClick={() => appActions.answer(question.key, option)}
                >
                  {option}
                </Chip>
              ))}
            </div>
            <Button
              disabled={!interview[question.key]}
              onClick={() => setStep((value) => value + 1)}
            >
              {step === total - 1 ? "답변 마치기" : "다음 질문"}
            </Button>
          </>
        )}
      </div>
      <Button
        variant="quiet"
        onClick={() =>
          step === 0 ? navigate("/text-input") : setStep((value) => value - 1)
        }
      >
        ← 이전 질문
      </Button>
    </>
  );
}
