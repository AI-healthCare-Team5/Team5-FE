import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button, PageTitle, Progress } from "@/components/ui";

const stages = [
  "알려주신 내용을 살펴봐요",
  "증상을 정리해요",
  "복용약과 병력을 모아요",
  "진료에 필요한 내용을 모아요",
  "한 장으로 정리해요",
];

export function SummaryLoadingPage() {
  const [stage, setStage] = useState(0);
  const navigate = useNavigate();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (stage === stages.length - 1) {
        navigate("/summary", { replace: true });
      } else {
        setStage((value) => value + 1);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [stage, navigate]);
  return (
    <>
      <PageTitle description="알려주신 내용을 의사 선생님께 보여드릴 수 있도록 정리하고 있어요.">
        진료 요약지를
        <br />
        만들고 있어요
      </PageTitle>
      <Progress current={stage + 1} total={5} />
      <p role="status" className="py-6 font-bold text-brand-strong">
        {stages[stage]}
      </p>
      <ol className="space-y-4">
        {stages.map((text, index) => (
          <li
            key={text}
            className={index <= stage ? "text-ink" : "text-subtle"}
          >
            <span aria-hidden="true">
              {index < stage ? "✓" : `${index + 1}.`}
            </span>{" "}
            {text}
          </li>
        ))}
      </ol>
      <Button
        variant="outline"
        onClick={() => navigate("/hospitals", { replace: true })}
      >
        취소
      </Button>
    </>
  );
}
