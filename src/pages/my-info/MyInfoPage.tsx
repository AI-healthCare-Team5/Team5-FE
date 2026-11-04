import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { WarningNotice } from "@/components/WarningNotice";
import { ActionLink, Button, Card, PageTitle } from "@/components/ui";
import { AccountCard } from "@/pages/my-info/components/AccountCard";
import {
  createMyInfoScreen,
  initialMyInfoView,
  type MyInfoScreen,
} from "@/pages/my-info/myInfoScreen";
import { useAppStore } from "@/stores/appStore";

// P01 본문(#32)은 이 페이지에서 계정 영역 아래에 합칩니다.
export function MyInfoPage() {
  const state = useAppStore();
  const navigate = useNavigate();
  const [view, setView] = useState(initialMyInfoView);
  const screenRef = useRef<MyInfoScreen | null>(null);
  const busy = view.busy !== null;

  // 내 정보 불러오기와 로그아웃, 탈퇴는 myInfoScreen.ts가 맡습니다.
  useEffect(() => {
    const screen = createMyInfoScreen({
      onView: setView,
      onExit: () => navigate("/"),
    });
    screenRef.current = screen;
    void screen.load();
    return () => {
      screen.dispose();
      screenRef.current = null;
    };
  }, [navigate]);

  return (
    <>
      <PageTitle description="계정과 저장된 기록을 관리할 수 있어요.">
        내 정보
      </PageTitle>
      {view.actionMessage && (
        <WarningNotice>{view.actionMessage}</WarningNotice>
      )}
      {view.phase === "loading" && (
        <Card>
          <p role="status">내 정보를 불러오는 중이에요.</p>
        </Card>
      )}
      {view.phase === "error" && (
        <>
          <WarningNotice>{view.message ?? ""}</WarningNotice>
          <Button
            disabled={busy}
            onClick={() => void screenRef.current?.load()}
          >
            다시 시도
          </Button>
        </>
      )}
      {view.phase !== "ready" && (
        // 내 정보를 불러오지 못했거나 아직 불러오는 중이어도 로그아웃할 수 있어야 합니다(쿠키는 남아 있을 수 있습니다).
        <Button
          variant="neutral"
          aria-busy={view.busy === "logout"}
          disabled={busy}
          onClick={() => void screenRef.current?.logout()}
        >
          로그아웃
        </Button>
      )}
      {view.phase === "ready" && (
        <AccountCard
          loggedIn={state.loggedIn}
          nickname={state.nickname}
          recordConsent={state.recordConsent}
          recordCount={state.recordCount}
          busy={busy}
          onLogout={() => void screenRef.current?.logout()}
          onWithdraw={() => void screenRef.current?.withdraw()}
        />
      )}
      <ActionLink to="/" variant="quiet">
        처음으로
      </ActionLink>
    </>
  );
}
