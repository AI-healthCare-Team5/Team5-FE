import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { isMockApi } from "@/api/client";
import { DesignIcon } from "@/components/DesignIcon";
import { ScreenIcon } from "@/components/ScreenElements";
import { SummaryDocument } from "@/components/summary/SummaryDocument";
import { WarningNotice } from "@/components/WarningNotice";
import { ActionLink, Button, Card, Notice, PageTitle } from "@/components/ui";
import { SummaryEditForm } from "@/pages/summary/components/SummaryEditForm";
import { SummaryStorage } from "@/pages/summary/components/SummaryStorage";
import { isSavePending } from "@/pages/summary/saveAfterReturn";
import {
  createSummaryScreen,
  initialSummaryView,
  type SummaryScreen,
} from "@/pages/summary/summaryScreen";
import { formatRecordDate } from "@/pages/records/formatRecordDate";
import { appActions, useAppStore } from "@/stores/appStore";

export function SummaryPage() {
  const { loggedIn, recordConsent, summarySaved, saveTarget } = useAppStore();
  const navigate = useNavigate();
  const [view, setView] = useState(initialSummaryView);
  const [large, setLarge] = useState(false);
  const screenRef = useRef<SummaryScreen | null>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const { session, summary } = view;

  // 불러오기와 확인·수정 요청, 이동은 summaryScreen.ts가 맡습니다.
  // 화면을 떠나면 진행 중인 요청을 취소합니다.
  useEffect(() => {
    const screen = createSummaryScreen({
      onView: setView,
      onExit: (to) =>
        navigate(to === "loading" ? "/summary-loading" : "/", {
          replace: true,
        }),
    });
    screenRef.current = screen;
    void screen.load();
    return () => {
      screen.dispose();
      screenRef.current = null;
    };
  }, [navigate]);

  // 수정 폼이 닫히면 눌렀던 버튼이 다시 그려지므로 그 버튼으로 포커스를 돌려줍니다.
  useEffect(() => {
    if (view.editing || !returnFocus.current) return;
    returnFocus.current = false;
    editButtonRef.current?.focus();
  }, [view.editing]);

  // 로그인·동의를 마치고 돌아왔으면 보관하려던 요약지를 보관합니다.
  // saveSummary는 같은 요약지를 두 번 보관하지 않아 effect가 두 번 돌아도 안전합니다.
  useEffect(() => {
    if (!session || !summary) return;
    const state = { loggedIn, recordConsent, summarySaved, saveTarget };
    if (!isSavePending(state, session)) return;
    appActions.saveSummary(summary);
    // 보관하러 나갔다는 기억을 지웁니다.
    appActions.prepareLogin();
  }, [session, summary, loggedIn, recordConsent, summarySaved, saveTarget]);

  function closeEditForm() {
    returnFocus.current = true;
    screenRef.current?.cancelEdit();
  }

  function goToRecordFlow(path: "/login" | "/record-consent") {
    // 로그인·동의를 마치면 이 화면으로 돌아와 이 요약지를 보관합니다.
    appActions.prepareLogin("/summary", session);
    navigate(path);
  }

  if (view.phase !== "ready" || !summary || !session) {
    return (
      <>
        <PageTitle>진료 요약지</PageTitle>
        {view.phase === "error" ? (
          <>
            <WarningNotice>{view.message ?? ""}</WarningNotice>
            <div className="flex flex-col gap-3">
              <Button onClick={() => void screenRef.current?.load()}>
                다시 시도
              </Button>
              <ActionLink to="/" variant="quiet">
                처음으로
              </ActionLink>
            </div>
          </>
        ) : (
          <Card>
            <p role="status">요약지를 불러오는 중이에요.</p>
          </Card>
        )}
      </>
    );
  }

  const busy = view.busy !== null;
  const caption = view.createdAt
    ? `AI가 정리한 내용 · ${formatRecordDate(view.createdAt)}`
    : "AI가 정리한 내용";

  return (
    <>
      <PageTitle description="진료실에서 이 화면을 의사 선생님께 보여 주세요.">
        진료 요약지가
        <br />
        준비됐어요
      </PageTitle>
      {view.editing ? (
        <SummaryEditForm
          summary={summary}
          saving={view.busy === "save"}
          error={view.saveMessage}
          fieldErrors={view.saveFieldErrors}
          onSave={(edits) => {
            // 저장하면 폼이 닫히므로 닫힌 뒤 포커스를 돌려줄 준비를 합니다. 실패하면 폼이 열려 있어 쓰이지 않습니다.
            returnFocus.current = true;
            void screenRef.current?.save(edits);
          }}
          onCancel={closeEditForm}
        />
      ) : (
        <>
          {isMockApi && (
            <Notice tone="amber">
              <span className="flex items-start gap-3">
                <DesignIcon name="info" />
                <span>
                  예시 요약지예요. 실제 문진 내용이 아니니 진료에 쓰지 마세요.
                </span>
              </span>
            </Notice>
          )}
          {!summary.isConfirmed && (
            <Notice>
              <span className="flex items-start gap-3">
                <DesignIcon name="info" />
                <span>
                  내용을 확인하고, 요약지 아래 ‘내용이 맞아요’ 버튼을 눌러
                  주세요.
                </span>
              </span>
            </Notice>
          )}
          <SummaryDocument summary={summary} caption={caption} large={large} />
          {view.confirmMessage && (
            <WarningNotice>{view.confirmMessage}</WarningNotice>
          )}
          <div className="flex flex-col gap-3">
            <Button
              variant={summary.isConfirmed ? "primary" : "outline"}
              aria-pressed={summary.isConfirmed}
              aria-busy={view.busy === "confirm"}
              disabled={busy}
              onClick={() => void screenRef.current?.confirm()}
            >
              내용이 맞아요
            </Button>
            <Button
              ref={editButtonRef}
              variant="neutral"
              disabled={busy}
              onClick={() => screenRef.current?.startEdit()}
            >
              <ScreenIcon name="write" size={22} />
              고칠 곳이 있어요
            </Button>
          </div>
        </>
      )}
      {!view.editing && (
        <>
          <SummaryStorage
            loggedIn={loggedIn}
            saved={summarySaved}
            onLogin={() => goToRecordFlow("/login")}
            onSave={() =>
              recordConsent
                ? appActions.saveSummary(summary)
                : goToRecordFlow("/record-consent")
            }
          />
          <div className="flex flex-col gap-3">
            <Button
              aria-pressed={large}
              onClick={() => setLarge((value) => !value)}
            >
              글자 크게 보여주기
            </Button>
            <ActionLink to="/hospitals" variant="outline">
              병원 안내로 돌아가기
            </ActionLink>
            <ActionLink to="/" variant="quiet">
              처음으로
            </ActionLink>
          </div>
        </>
      )}
    </>
  );
}
