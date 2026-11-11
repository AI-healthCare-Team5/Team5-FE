import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import type { IntakeStage } from "@/api/enums";
import { ReaskNotice } from "@/components/ReaskNotice";
import { WarningNotice } from "@/components/WarningNotice";
import { ActionLink, Button, Progress } from "@/components/ui";
import { useVoiceRecorder } from "@/lib/voice/useVoiceRecorder";
import { VoiceControl } from "@/pages/interview/components/VoiceControl";
import {
  createVoiceInterview,
  initialVoiceInterviewView,
  type VoiceInterview,
  type VoiceInterviewExit,
} from "@/pages/interview/voiceInterview";
import { IntakeAnswerChoices } from "@/pages/text-input/components/IntakeAnswerChoices";
import { answerChoices, canAnswerNone, NONE_ANSWER } from "@/stores/intakeFlow";
import { readIntakeSession, type IntakeSession } from "@/stores/intakeSession";

const stageLabels: Record<IntakeStage, string> = {
  SYMPTOM: "증상 확인",
  BASIC_INFO: "기본 정보",
};

const exitPaths: Record<VoiceInterviewExit, string> = {
  emergency: "/emergency",
  start: "/",
};

// 마이크를 쓸 수 없는 경우입니다. 문진을 시작하기 전이면 글로 입력하는 길을 안내하는 S02a로 보냅니다.
// 문진을 이미 시작했다면 S02a의 "글로 입력하기"가 새 문진을 만들어 앞선 답을 잃게 하므로 이 화면에 머뭅니다.
const micUnavailableKinds = ["unsupported", "permission-denied", "no-device"];

// S03은 서버 문진을 말로 이어갑니다. 말한 내용은 STT로 글자로 바꿔 inputMode=VOICE로 보내고,
// 버튼으로 답하면 BUTTON으로 보냅니다. "글로 입력하기"는 새 문진이 아니라 지금 질문부터 S04a로 이어갑니다.
// 문진을 이미 시작했다면(S04a에서 돌아온 경우 포함) 기억한 문진의 현재 질문에서 이어서 묻습니다.
export function InterviewPage() {
  const [session] = useState(readIntakeSession);
  return <InterviewScreen session={session} />;
}

function InterviewScreen({ session }: { session: IntakeSession | null }) {
  const navigate = useNavigate();
  const [view, setView] = useState(() => initialVoiceInterviewView(session));
  const interviewRef = useRef<VoiceInterview | null>(null);

  useEffect(() => {
    const interview = createVoiceInterview(session, {
      onView: setView,
      onExit: (to) => navigate(exitPaths[to], { replace: true }),
    });
    interviewRef.current = interview;
    return () => {
      interview.dispose();
      interviewRef.current = null;
    };
  }, [session, navigate]);

  // 화면을 떠나면 훅이 마이크를 놓고 녹음을 버립니다. 받은 녹음은 글자로 바꾸는 동안에만 쓰고 남기지 않습니다.
  const recorder = useVoiceRecorder({
    onRecorded: (recording) =>
      void interviewRef.current?.submitRecording(recording),
  });

  const micError = recorder.error;
  const micUnavailable =
    micError !== null && micUnavailableKinds.includes(micError.kind);

  const { intake, busy, transcribing, failure, message, suggestTextInput } =
    view;
  const question = intake?.question ?? null;
  const complete = intake?.status === "COMPLETED";
  const choices = question ? answerChoices(question) : [];
  const reask = (intake?.reask ?? false) || failure?.kind === "not-understood";

  const headingRef = useRef<HTMLHeadingElement>(null);
  // 마이크 오류나 인식 실패 안내가 생기면, 하단 119 바 아래나 화면 밖에 있지 않도록 보이는 곳까지만 스크롤합니다.
  // 화면 낭독기는 role="alert"로 따로 읽습니다.
  const noticesRef = useRef<HTMLDivElement>(null);
  const hasNotice = Boolean(
    micError || (failure && failure.kind !== "not-understood") || message,
  );
  useEffect(() => {
    if (hasNotice) noticesRef.current?.scrollIntoView({ block: "nearest" });
  }, [hasNotice, micError, failure, message]);
  // 질문이 바뀌어도 주소는 그대로라, 바뀐 질문 제목으로 직접 포커스를 옮깁니다.
  // 처음 그릴 때는 AppShell이 h1에 포커스를 줍니다.
  const focusKey = complete ? "complete" : (question?.questionId ?? "start");
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

  // 문진을 시작하기 전(intake === null)에만 S02a로 보냅니다.
  if (micUnavailable && intake === null) {
    return <Navigate to="/mic-guide/unavailable" replace />;
  }

  // 마이크는 질문 바로 아래에 둡니다. 말로 답하는 화면이라, 선택지가 많거나 글자를 키워도
  // 스크롤하지 않고 찾을 수 있어야 하고 하단 119 바에 가리지 않아야 합니다.
  // 마이크 오류와 인식 실패 안내는 마이크 바로 옆에서 읽도록 함께 둡니다.
  const notices = hasNotice ? (
    <div ref={noticesRef} className="flex scroll-mb-[96px] flex-col gap-3">
      {micError && <WarningNotice>{micError.message}</WarningNotice>}
      {failure && failure.kind !== "not-understood" && (
        <WarningNotice>{failure.message}</WarningNotice>
      )}
      {message && <WarningNotice>{message}</WarningNotice>}
    </div>
  ) : null;
  const voiceArea = (
    <>
      <VoiceControl
        status={recorder.status}
        busy={busy}
        transcribing={transcribing}
        onStart={() => void recorder.start()}
        onStop={recorder.stop}
        onCancel={recorder.cancel}
      />
      {notices}
    </>
  );

  return (
    <>
      {intake && (
        <Progress
          current={intake.progress.current}
          total={intake.progress.total}
          label={complete ? "문진 완료" : stageLabels[intake.stage]}
        />
      )}
      {intake && intake.collected.length > 0 && (
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
            {complete
              ? "정리했어요"
              : intake
                ? question?.text
                : "어디가 불편하세요?"}
          </h1>
        </section>
        {complete ? (
          <>
            <p className="text-muted">
              알려주신 내용으로 알맞은 병원을 찾아볼게요.
            </p>
            <ActionLink to="/location">병원 안내 보기</ActionLink>
            {notices}
          </>
        ) : (
          <>
            {question && choices.length > 0 ? (
              <IntakeAnswerChoices
                key={question.questionId}
                question={question}
                reask={reask}
                last={intake?.progress.current === intake?.progress.total}
                busy={busy}
                beforeChoices={voiceArea}
                onSubmit={(choice) =>
                  void interviewRef.current?.chooseAnswer(choice)
                }
              />
            ) : (
              <>
                <ReaskNotice show={reask} />
                {voiceArea}
                {/* 녹음 시작·녹음 중·글자로 바꾸는 중·전송 중에는 마이크 답과 겹치지 않도록 잠급니다. */}
                {question && canAnswerNone(question) && (
                  <Button
                    variant="outline"
                    disabled={busy || recorder.status !== "idle"}
                    onClick={() => void interviewRef.current?.answerNone()}
                  >
                    {NONE_ANSWER}
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {/* 끝난 문진은 서버에서 이전 질문으로 돌아갈 수 없습니다(INTAKE_409). */}
        {intake && !complete && (
          <Button
            variant="quiet"
            disabled={busy || recorder.status !== "idle"}
            onClick={() => void interviewRef.current?.back()}
          >
            ← 이전 질문
          </Button>
        )}
        {/* 문진을 시작했다면 새로 시작하지 않고 지금 질문부터 이어서 답합니다. */}
        {!complete && (
          <ActionLink
            to={intake ? "/text-input/questions" : "/text-input"}
            variant={suggestTextInput || micError ? "primary" : "outline"}
          >
            글로 입력하기
          </ActionLink>
        )}
      </div>
    </>
  );
}
