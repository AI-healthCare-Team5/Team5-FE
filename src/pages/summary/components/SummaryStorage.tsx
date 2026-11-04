import { isMockApi } from "@/api/client";
import { WarningNotice } from "@/components/WarningNotice";
import { ActionLink, Button, Card } from "@/components/ui";

export interface SummaryStorageProps {
  loggedIn: boolean;
  saved: boolean;
  // 보관 요청이 진행 중이면 버튼을 잠가 이중 전송을 막습니다. 확인·수정 요청이 진행 중일 때도 잠급니다.
  saving?: boolean;
  // 보관하지 못했을 때의 안내입니다. 버튼을 다시 눌러 재시도할 수 있습니다.
  message?: string | null;
  onLogin: () => void;
  onSave: () => void;
}

export function SummaryStorage({
  loggedIn,
  saved,
  saving = false,
  message = null,
  onLogin,
  onSave,
}: SummaryStorageProps) {
  // 백엔드가 기록 저장 API를 구현하기 전에는 실제 경로에서 이 카드 전체를 숨깁니다.
  // 백엔드 develop(061842f)의 보관·기록·동의·내 정보 컨트롤러는 아직 NOT_IMPLEMENTED(COMMON_501)를 던집니다.
  // "저장했어요"와 "내 기록에서 다시 볼 수 있어요" 모두 지금은 지킬 수 없는 약속입니다.
  // 백엔드 구현이 배포되고 실제로 확인되면 이 조건을 지웁니다.
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
      {message && (
        <div className="mb-4">
          <WarningNotice>{message}</WarningNotice>
        </div>
      )}
      {!loggedIn ? (
        <Button variant="outline" onClick={onLogin}>
          로그인하고 보관하기
        </Button>
      ) : saved ? (
        <ActionLink to="/records" variant="outline">
          내 기록 보기
        </ActionLink>
      ) : (
        <Button
          variant="outline"
          aria-busy={saving}
          disabled={saving}
          onClick={onSave}
        >
          내 기록에 보관하기
        </Button>
      )}
    </Card>
  );
}
