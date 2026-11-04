import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import type { IntakeStage } from "@/api/enums";
import { WarningNotice } from "@/components/WarningNotice";
import { ActionLink, Button, Progress } from "@/components/ui";
import { IntakeAnswerChoices } from "@/pages/text-input/components/IntakeAnswerChoices";
import { IntakeAnswerText } from "@/pages/text-input/components/IntakeAnswerText";
import {
  canShowIntake,
  createIntakeQuestions,
  initialQuestionsView,
  type IntakeQuestions,
  type IntakeQuestionsExit,
} from "@/pages/text-input/intakeQuestions";
import { readIntakeSession, type IntakeSession } from "@/stores/intakeSession";

const stageLabels: Record<IntakeStage, string> = {
  SYMPTOM: "증상 확인",
  BASIC_INFO: "기본 정보",
};

const exitPaths: Record<IntakeQuestionsExit, string> = {
  "text-input": "/text-input",
  emergency: "/emergency",
  start: "/",
};

// S04a는 서버가 보낸 질문(question)·진행(progress)·모은 정보(collected)를 그대로 그립니다.
// 문진은 S04에서 "다음"을 누를 때 시작해 메모리에 기억해 둡니다. 새로고침이나 주소로 바로 들어오면 없으므로 S04부터 다시 시작합니다.
export function TextInputQuestionsPage() {
  const [session] = useState(readIntakeSession);
  if (!canShowIntake(session)) {
    return <Navigate to="/text-input" replace />;
  }
  return <IntakeQuestionsScreen session={session} />;
}

// 답변·이전 질문 요청과 이동은 intakeQuestions.ts가 맡습니다. 화면을 떠나면 진행 중인 요청을 취소합니다.
function IntakeQuestionsScreen({ session }: { session: IntakeSession }) {
  const navigate = useNavigate();
  const [view, setView] = useState(() => initialQuestionsView(session));
  const questionsRef = useRef<IntakeQuestions | null>(null);

  useEffect(() => {
    const questions = createIntakeQuestions(session, {
      onView: setView,
      onExit: (to) => navigate(exitPaths[to], { replace: true }),
    });
    questionsRef.current = questions;
    return () => {
      questions.dispose();
      questionsRef.current = null;
    };
  }, [session, navigate]);

  const { intake, busy, message, restored } = view;
  const { question } = intake;
  const complete = intake.status === "COMPLETED";
  const { current, total } = intake.progress;

  const headingRef = useRef<HTMLHeadingElement>(null);
  // 질문이 바뀌어도 주소는 그대로라, 바뀐 질문 제목으로 직접 포커스를 옮깁니다.
  // 처음 그릴 때는 AppShell이 h1에 포커스를 줍니다.
  const focusKey = complete ? "complete" : question?.questionId;
  const shownFocusKey = useRef(focusKey);
  useEffect(() => {
    if (shownFocusKey.current === focusKey) {
      return;
    }
    shownFocusKey.current = focusKey;
    const heading = headingRef.current;
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [focusKey]);

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
            ref={headingRef}
            className="text-[1.444rem] leading-[1.4] font-bold tracking-[-0.5px]"
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
          question &&
          (question.answerType === "FREE_TEXT" ? (
            <IntakeAnswerText
              key={question.questionId}
              question={question}
              reask={intake.reask}
              last={current === total}
              busy={busy}
              initialText={restored?.answer ?? ""}
              onSubmit={(text) =>
                void questionsRef.current?.submit({
                  inputMode: "TEXT",
                  answer: text,
                })
              }
            />
          ) : (
            <IntakeAnswerChoices
              key={question.questionId}
              question={question}
              reask={intake.reask}
              last={current === total}
              busy={busy}
              initialCode={
                restored?.inputMode === "BUTTON" ? restored.answer : null
              }
              onSubmit={(choice) =>
                void questionsRef.current?.submit({
                  inputMode: "BUTTON",
                  answer: choice.code,
                })
              }
            />
          ))
        )}
        {message && <WarningNotice>{message}</WarningNotice>}
      </div>
      {/* 끝난 문진은 서버에서 이전 질문으로 돌아갈 수 없습니다(INTAKE_409). */}
      {!complete && (
        <Button
          variant="quiet"
          disabled={busy}
          onClick={() => void questionsRef.current?.back()}
        >
          ← 이전 질문
        </Button>
      )}
    </>
  );
}
