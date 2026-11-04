import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import type { IntakeStage } from "@/api/enums";
import { ActionLink, Button, Progress } from "@/components/ui";
import { IntakeAnswerChoices } from "@/pages/text-input/components/IntakeAnswerChoices";
import { appActions, useAppStore } from "@/stores/appStore";
import type { IntakeOption } from "@/stores/intakeFlow";
import {
  addSampleAnswer,
  createSampleIntakeView,
  sampleInterviewKey,
  type SampleAnswer,
} from "@/stores/sampleIntake";

const stageLabels: Record<IntakeStage, string> = {
  SYMPTOM: "증상 확인",
  BASIC_INFO: "기본 정보",
};

// S04a는 서버가 보낸 질문(question)·진행(progress)·모은 정보(collected)를 그대로 그립니다.
// 문진 API(#26) 연결 전까지는 같은 모양의 가짜 응답(sampleIntake)을 씁니다.
export function TextInputQuestionsPage() {
  const { intakeStart } = useAppStore();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<SampleAnswer[]>([]);
  // 이전 질문으로 돌아가면 서버는 직전 답을 지우고 다시 묻습니다. 화면에는 고른 답을 다시 보여 줍니다.
  const [restoredCode, setRestoredCode] = useState<string | null>(null);
  // 새로고침이나 주소로 바로 들어와 S04에서 만든 시작 요청이 없으면 S04부터 다시 시작합니다.
  if (!intakeStart) {
    return <Navigate to="/text-input" replace />;
  }
  const intake = createSampleIntakeView(intakeStart, answers);
  const { question } = intake;
  const complete = intake.status === "COMPLETED";
  const { current, total } = intake.progress;

  function submit(questionId: string, choice: IntakeOption) {
    const interviewKey = sampleInterviewKey(questionId);
    if (interviewKey) {
      appActions.answer(interviewKey, choice.label);
    }
    setAnswers(addSampleAnswer(answers, questionId, choice));
    setRestoredCode(null);
  }

  // 첫 질문에서는 S04로 돌아가 부위·시작 시점을 다시 고르게 합니다.
  function goBack() {
    const previous = answers.at(-1);
    if (!previous) {
      navigate("/text-input");
      return;
    }
    setAnswers(answers.slice(0, -1));
    setRestoredCode(previous.code);
  }

  return (
    <>
      <Progress
        current={current}
        total={total}
        label={complete ? "문진 완료" : stageLabels[intake.stage]}
      />
      {intake.collected.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[0.889rem] font-medium text-muted">
            지금까지 알려주신 내용
          </p>
          <ul className="flex flex-wrap gap-2">
            {/* collected는 서버가 순서대로 쌓는 문장 목록이라 따로 id가 없습니다. 같은 문장이 둘일 수 있어 순서를 함께 씁니다. */}
            {intake.collected.map((item, index) => (
              <li
                key={`${index}-${item}`}
                className="rounded-full bg-brand-soft px-[14px] py-[6px] text-[0.889rem] font-medium text-brand-strong"
              >
                {item}
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
            {complete ? "정리했어요" : question?.text}
          </h1>
        </section>
        {complete ? (
          <>
            <p className="text-muted">
              알려주신 내용으로 알맞은 병원을 찾아볼게요.
            </p>
            <ActionLink to="/location">병원 안내 보기</ActionLink>
          </>
        ) : (
          question && (
            <IntakeAnswerChoices
              key={question.questionId}
              question={question}
              reask={intake.reask}
              last={current === total}
              initialCode={restoredCode}
              onSubmit={(choice) => submit(question.questionId, choice)}
            />
          )
        )}
      </div>
      {/* 끝난 문진은 서버에서 이전 질문으로 돌아갈 수 없습니다(INTAKE_409). */}
      {!complete && (
        <Button variant="quiet" onClick={goBack}>
          ← 이전 질문
        </Button>
      )}
    </>
  );
}
