import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
import { actionForSaveOutcome } from "@/pages/summary/saveOutcome";
import {
  createSummaryScreen,
  initialSummaryView,
  type SummaryScreen,
} from "@/pages/summary/summaryScreen";
import { formatRecordDate } from "@/pages/records/formatRecordDate";
import { appActions, useAppStore } from "@/stores/appStore";
import {
  isSavingSummary,
  saveCurrentSummary,
  subscribeSaving,
  type SaveSummaryOutcome,
} from "@/stores/recordSave";
import type { SummarySession } from "@/stores/summarySession";

export function SummaryPage() {
  const { loggedIn, recordConsent, summarySaved, saveTarget } = useAppStore();
  const navigate = useNavigate();
  const [view, setView] = useState(initialSummaryView);
  const [large, setLarge] = useState(false);
  // 보관하지 못했을 때의 안내입니다.
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const screenRef = useRef<SummaryScreen | null>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  // 보관 요청이 끝났을 때 이미 이 화면을 떠났다면 안내나 이동을 하지 않습니다.
  const mounted = useRef(false);
  const { session, summary } = view;
  // 보관 요청이 진행 중인지는 요청을 보낸 쪽(버튼, 로그인·동의 뒤 자동 보관)과 상관없이 같은 값으로 읽습니다.
  const saving = useSyncExternalStore(
    subscribeSaving,
    () => isSavingSummary(session?.summaryId),
    () => false,
  );

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

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // 수정 폼이 닫히면 눌렀던 버튼이 다시 그려지므로 그 버튼으로 포커스를 돌려줍니다.
  useEffect(() => {
    if (view.editing || !returnFocus.current) return;
    returnFocus.current = false;
    editButtonRef.current?.focus();
  }, [view.editing]);

  function goToRecordFlow(path: "/login" | "/record-consent") {
    // 로그인·동의를 마치면 이 화면으로 돌아와 이 요약지를 보관합니다.
    appActions.prepareLogin("/summary", session);
    navigate(path);
  }

  // 보관 결과에 따라 안내하거나 이동합니다.
  const showSaveOutcome = useCallback(
    (outcome: SaveSummaryOutcome) => {
      if (!mounted.current) return;
      const action = actionForSaveOutcome(outcome);
      if (action.kind === "message") {
        setSaveMessage(action.message);
        return;
      }
      setSaveMessage(null);
      // 로그인·동의를 마치면 이 화면으로 돌아와 이 요약지를 보관합니다.
      if (action.resumeSave) appActions.prepareLogin("/summary", session);
      navigate(action.to, { replace: action.replace });
    },
    [session, navigate],
  );

  // 서버에 보관을 요청합니다. 같은 요약지를 동시에 두 번 보관하려 해도 요청은 한 번만 보냅니다(StrictMode의 effect 두 번 실행 포함).
  // 버튼을 누른 경우와 로그인·동의 뒤 자동 보관 모두 이 요청을 씁니다.
  const requestSave = useCallback(
    (target: SummarySession) => {
      void saveCurrentSummary(target).then(showSaveOutcome);
    },
    [showSaveOutcome],
  );

  // 로그인·동의를 마치고 돌아왔으면 보관하려던 요약지를 보관합니다.
  useEffect(() => {
    if (!session || !summary) return;
    const state = { loggedIn, recordConsent, summarySaved, saveTarget };
    if (!isSavePending(state, session)) return;
    // 보관하러 나갔다는 기억을 지웁니다. 실패하면 보관하기 버튼으로 다시 시도합니다.
    appActions.prepareLogin();
    requestSave(session);
  }, [
    session,
    summary,
    loggedIn,
    recordConsent,
    summarySaved,
    saveTarget,
    requestSave,
  ]);
  function closeEditForm() {
    returnFocus.current = true;
    screenRef.current?.cancelEdit();
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

  // 보관 요청이 진행 중이면 확인·수정도 잠급니다. 서버가 보관하면 요약지를 지우므로 그 뒤의 요청은 SUMMARY_404가 됩니다.
  const busy = view.busy !== null || saving;
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
            saving={busy}
            message={saveMessage}
            onLogin={() => goToRecordFlow("/login")}
            onSave={() => {
              if (!recordConsent) {
                goToRecordFlow("/record-consent");
                return;
              }
              setSaveMessage(null);
              requestSave(session);
            }}
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
