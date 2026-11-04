import { useId, useState } from "react";
import { ReaskNotice } from "@/components/ReaskNotice";
import { Button } from "@/components/ui";
import type { IntakeQuestion } from "@/stores/intakeFlow";

// 서버는 복용약·앓는 병·알레르기를 FREE_TEXT로 묻고, 이런 질문은 글이나 말로만 답할 수 있습니다(버튼이면 INTAKE_400).
// 그래서 선택지 대신 글로 답하는 칸을 그립니다. 질문이 바뀌면 입력이 초기화되도록 부모에서 questionId를 key로 줍니다.
export function IntakeAnswerText({
  question,
  reask,
  last,
  busy = false,
  initialText = "",
  onSubmit,
}: {
  question: IntakeQuestion;
  // 같은 질문을 다시 묻는 중이면 안내를 보여 줍니다.
  reask: boolean;
  // 마지막 질문이면 버튼 문구를 "답변 마치기"로 바꿉니다.
  last: boolean;
  // 답변 요청이 진행 중이면 입력칸과 버튼을 잠급니다.
  busy?: boolean;
  // 이전 질문으로 돌아왔을 때 직전에 쓴 글을 다시 보여 줍니다.
  initialText?: string;
  // 앞뒤 공백을 뺀 글을 돌려줍니다.
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState(initialText);
  const inputId = useId();
  const answer = text.trim();
  return (
    <>
      <ReaskNotice show={reask} />
      <div className="flex flex-col gap-2">
        {/* 질문은 위 제목에 있어서 눈에는 보이지 않지만, 입력칸의 이름으로 읽히도록 둡니다. */}
        <label htmlFor={inputId} className="sr-only">
          {question.text}
        </label>
        <textarea
          id={inputId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={busy}
          maxLength={200}
          rows={3}
          className="min-h-[7rem] w-full resize-y rounded-[16px] border border-control bg-surface px-4 py-3 placeholder:text-subtle disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      <Button
        disabled={answer === "" || busy}
        aria-busy={busy}
        onClick={() => {
          if (answer !== "") {
            onSubmit(answer);
          }
        }}
      >
        {last ? "답변 마치기" : "다음 질문"}
      </Button>
    </>
  );
}
