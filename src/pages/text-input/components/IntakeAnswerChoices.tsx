import { useState } from "react";
import { DesignIcon } from "@/components/DesignIcon";
import { Button, Chip, Notice } from "@/components/ui";
import {
  answerChoices,
  type IntakeOption,
  type IntakeQuestion,
} from "@/stores/intakeFlow";

// 서버가 보낸 질문의 선택지를 그리고, 고른 선택지를 code와 함께 돌려줍니다.
// 질문이 바뀌면 선택이 초기화되도록 부모에서 questionId를 key로 줍니다.
export function IntakeAnswerChoices({
  question,
  reask,
  last,
  initialCode = null,
  onSubmit,
}: {
  question: IntakeQuestion;
  // 같은 질문을 다시 묻는 중이면 안내를 보여 줍니다.
  reask: boolean;
  // 마지막 질문이면 버튼 문구를 "답변 마치기"로 바꿉니다.
  last: boolean;
  // 이전 질문으로 돌아왔을 때 직전에 고른 답을 다시 보여 줍니다.
  initialCode?: string | null;
  onSubmit: (choice: IntakeOption) => void;
}) {
  const [selectedCode, setSelectedCode] = useState(initialCode);
  const choices = answerChoices(question);
  const selected = choices.find((choice) => choice.code === selectedCode);
  return (
    <>
      <div role="status">
        {reask && (
          <Notice tone="amber">
            <span className="flex items-start gap-3">
              <DesignIcon name="info" size={20} />
              <span>다시 말씀해 주세요</span>
            </span>
          </Notice>
        )}
      </div>
      {/* 선택지가 홀수(네·아니요·잘 모르겠어요 등)면 2열에서 하나가 남고 큰 글자에서 단어가 끊겨서 한 줄에 하나씩 놓습니다. */}
      <div
        className={`grid gap-[10px] ${choices.length % 2 === 0 ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {choices.map((choice) => (
          <Chip
            key={choice.code}
            selected={choice.code === selectedCode}
            onClick={() => setSelectedCode(choice.code)}
          >
            {choice.label}
          </Chip>
        ))}
      </div>
      <Button
        disabled={!selected}
        onClick={() => {
          if (selected) {
            onSubmit(selected);
          }
        }}
      >
        {last ? "답변 마치기" : "다음 질문"}
      </Button>
    </>
  );
}
