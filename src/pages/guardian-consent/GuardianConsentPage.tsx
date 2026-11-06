import { useLocation, useNavigate } from "react-router";
import { GUARDIAN_STORAGE_TEXT } from "@/components/guardian/guardianText";
import { ActionLink, Button, Card, Notice, PageTitle } from "@/components/ui";

const items = [
  [
    "왜 저장하나요?",
    "응급 카드에 보호자 연락처를 보여 드려요. 구급대원이 바로 전화할 수 있어요.",
  ],
  ["무엇을 저장하나요?", "보호자와의 관계, 보호자의 전화번호"],
  ["어디에, 얼마나 저장하나요?", `${GUARDIAN_STORAGE_TEXT}.`],
  [
    "동의하지 않으면요?",
    "병원 안내와 요약지는 그대로 쓸 수 있어요. 응급 카드에 보호자 연락처만 나오지 않아요.",
  ],
  ["동의를 거두려면요?", "내 정보에서 연락처를 지우면 동의도 함께 거두어져요."],
  [
    "알아 두세요",
    "보호자분의 전화번호예요. 등록하기 전에 보호자분께 미리 알려 주세요.",
  ],
];

export function GuardianConsentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromGuardian =
    new URLSearchParams(location.search).get("from") === "guardian";
  const returnTo = fromGuardian ? "/guardian" : "/my-info";
  return (
    <>
      <PageTitle>
        보호자 연락처
        <br />
        저장 동의
      </PageTitle>
      <Notice tone="amber">
        정책이 정해지기 전의 문구예요. 검토 후 바뀔 수 있어요.
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
      <Button onClick={() => navigate(returnTo)}>확인했어요</Button>
      <ActionLink to={returnTo} variant="outline">
        {fromGuardian ? "연락처 등록으로 돌아가기" : "돌아가기"}
      </ActionLink>
    </>
  );
}
