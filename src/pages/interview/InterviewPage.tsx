import { useState } from "react";
import {
  ActionLink,
  Button,
  Card,
  Chip,
  PageTitle,
  Progress,
} from "@/components/ui";
import { appActions, useAppStore } from "@/stores/appStore";
import { interviewQuestions } from "@/stores/interviewQuestions";

export function InterviewPage() {
  const { interview } = useAppStore();
  const [step, setStep] = useState(0);
  const complete = step === interviewQuestions.length;
  const question =
    interviewQuestions[Math.min(step, interviewQuestions.length - 1)];
  return (
    <>
      <Progress current={Math.min(step + 1, 7)} total={7} />
      <PageTitle
        eyebrow="알려주신 내용"
        description={
          complete ? "알려주신 내용으로 알맞은 병원을 찾아볼게요." : undefined
        }
      >
        {complete ? "정리했어요" : "몇 가지만 여쭤볼게요"}
      </PageTitle>
      <div className="flex flex-wrap gap-2">
        {Object.values(interview)
          .filter((value) => value !== "잘 모르겠어요")
          .map((value, index) => (
            <span
              key={`${index}-${value}`}
              className="rounded-full bg-brand-soft px-3 py-1 text-[0.833rem] text-brand-strong"
            >
              {value}
            </span>
          ))}
      </div>
      {complete ? (
        <ActionLink to="/location">병원 안내 보기</ActionLink>
      ) : (
        <>
          <Card className="border-ink bg-ink text-white">
            <p className="mb-2 text-[0.833rem] text-[#b7cafa]">
              꼭 필요한 것만 여쭤볼게요
            </p>
            <h2 className="text-[1.222rem] font-bold" aria-live="polite">
              {question.title}
            </h2>
          </Card>
          {question.description && (
            <p className="text-[0.889rem] text-muted">{question.description}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
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
            {step === 6 ? "답변 마치기" : "다음 질문"}
          </Button>
        </>
      )}
      <Button
        variant="quiet"
        disabled={step === 0}
        onClick={() => setStep((value) => Math.max(0, value - 1))}
      >
        ← 이전 질문
      </Button>
      <ActionLink to="/text-input" variant="outline">
        글로 입력하기
      </ActionLink>
    </>
  );
}
