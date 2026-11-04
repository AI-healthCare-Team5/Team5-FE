import { isMockApi } from "@/api/client";
import { ActionLink, Button, Card } from "@/components/ui";

export interface SummaryStorageProps {
  loggedIn: boolean;
  saved: boolean;
  onLogin: () => void;
  onSave: () => void;
}

export function SummaryStorage({
  loggedIn,
  saved,
  onLogin,
  onSave,
}: SummaryStorageProps) {
  // 기록 저장 API(#29)가 연결되기 전에는 실제 경로에서 이 카드 전체를 숨깁니다.
  // "저장했어요"와 "내 기록에서 다시 볼 수 있어요" 모두 아직 지킬 수 없는 약속이기 때문입니다.
  if (!isMockApi) return null;

  let description = "로그인하면 이 요약지를 내 기록에서 다시 볼 수 있어요.";
  if (loggedIn) {
    description = saved
      ? "내 기록에 저장했어요."
      : "이 요약지를 내 기록에 보관할 수 있어요.";
  }

  return (
    <Card>
      <h2 className="mb-2 font-bold">내 기록에 보관</h2>
      <p className="mb-4 text-[0.889rem] text-muted">{description}</p>
      {!loggedIn ? (
        <Button variant="outline" onClick={onLogin}>
          로그인하고 보관하기
        </Button>
      ) : saved ? (
        <ActionLink to="/records" variant="outline">
          내 기록 보기
        </ActionLink>
      ) : (
        <Button variant="outline" onClick={onSave}>
          내 기록에 보관하기
        </Button>
      )}
    </Card>
  );
}
