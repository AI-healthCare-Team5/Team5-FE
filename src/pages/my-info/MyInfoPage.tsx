import { useNavigate } from "react-router";
import { ActionLink, PageTitle } from "@/components/ui";
import { AccountCard } from "@/pages/my-info/components/AccountCard";
import { appActions, useAppStore } from "@/stores/appStore";

// P01 본문(#32)은 이 페이지에서 계정 영역 아래에 합칩니다.
export function MyInfoPage() {
  const state = useAppStore();
  const navigate = useNavigate();
  return (
    <>
      <PageTitle description="계정과 저장된 기록을 관리할 수 있어요.">
        내 정보
      </PageTitle>
      <AccountCard
        loggedIn={state.loggedIn}
        nickname={state.nickname}
        recordConsent={state.recordConsent}
        recordCount={state.records.length}
        onLogout={() => {
          appActions.logout();
          navigate("/");
        }}
        onWithdraw={() => {
          appActions.withdraw();
          navigate("/");
        }}
      />
      <ActionLink to="/" variant="quiet">
        처음으로
      </ActionLink>
    </>
  );
}
