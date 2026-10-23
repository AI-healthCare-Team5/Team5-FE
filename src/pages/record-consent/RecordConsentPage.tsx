import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { ActionLink, Button, Card, Notice, PageTitle } from "@/components/ui";
import { appActions, useAppStore } from "@/stores/appStore";

const items = [
  [
    "왜 저장하나요?",
    "만든 요약지를 내 기록에 보관해서, 나중에 다시 볼 수 있게 해요.",
  ],
  [
    "무엇을 저장하나요?",
    "카카오 닉네임(선택), 문진 답변(나이대·성별·증상·복용약·앓는 병·알레르기), 안내받은 진료과, 요약지",
  ],
  [
    "어디에, 얼마나 저장하나요?",
    "저장 위치와 보관 기간은 정책이 확정되면 이곳에 안내해요.",
  ],
  [
    "동의하지 않으면요?",
    "로그인 없이도 병원 안내, 요약지, 119는 그대로 쓸 수 있어요. 내 기록 보관만 쓸 수 없어요.",
  ],
  [
    "동의를 거두려면요?",
    "내 정보에서 기록을 모두 지우면 동의도 함께 거두어져요.",
  ],
  [
    "알아 두세요",
    "건강에 관한 내용이 들어 있어요. 함께 쓰는 기기라면 쓰고 나서 꼭 로그아웃해 주세요.",
  ],
];

export function RecordConsentPage() {
  const [checked, setChecked] = useState(false);
  const { loggedIn, returnTo } = useAppStore();
  const navigate = useNavigate();
  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }
  function agree() {
    if (!checked) {
      return;
    }
    appActions.agreeToRecords();
    if (returnTo === "/summary") {
      appActions.saveSummary();
    }
    navigate(returnTo);
  }
  return (
    <>
      <PageTitle>
        진료 기록
        <br />
        저장 동의
      </PageTitle>
      <Notice tone="amber">
        초안 · 정책이 정해지기 전의 문구예요. 검토 후 바뀔 수 있어요.
      </Notice>
      <Card>
        <dl className="space-y-5">
          {items.map(([title, text]) => (
            <div key={title}>
              <dt className="mb-2 font-bold">{title}</dt>
              <dd className="text-[0.889rem] text-muted">{text}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="h-[44px] w-[44px] shrink-0 accent-brand"
        />
        <span className="font-semibold">[필수] 진료 기록 저장에 동의해요</span>
      </label>
      <Button disabled={!checked} onClick={agree}>
        동의하고 시작하기
      </Button>
      <ActionLink to="/" variant="quiet">
        동의하지 않아요
      </ActionLink>
    </>
  );
}
