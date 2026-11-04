import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { DesignIcon } from "@/components/DesignIcon";
import { ScreenIcon } from "@/components/ScreenElements";
import { SummaryDocument } from "@/components/summary/SummaryDocument";
import { ActionLink, Button, Notice, PageTitle } from "@/components/ui";
import { SummaryEditForm } from "@/pages/summary/components/SummaryEditForm";
import { SummaryStorage } from "@/pages/summary/components/SummaryStorage";
import { applySummaryEdits } from "@/pages/summary/editSummary";
import {
  sampleSummary,
  sampleSummaryCreatedAt,
} from "@/pages/summary/sampleSummary";
import { formatRecordDate } from "@/pages/records/formatRecordDate";
import { appActions, useAppStore } from "@/stores/appStore";

export function SummaryPage() {
  const { loggedIn, recordConsent, summarySaved } = useAppStore();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(sampleSummary);
  const [large, setLarge] = useState(false);
  const [editing, setEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  // 수정 폼이 닫히면 눌렀던 버튼이 다시 그려지므로 그 버튼으로 포커스를 돌려줍니다.
  useEffect(() => {
    if (editing || !returnFocus.current) return;
    returnFocus.current = false;
    editButtonRef.current?.focus();
  }, [editing]);

  function closeEditForm() {
    returnFocus.current = true;
    setEditing(false);
  }

  function goToRecordFlow(path: "/login" | "/record-consent") {
    // 로그인·동의를 마치면 이 화면으로 돌아와 보관합니다.
    appActions.prepareLogin("/summary");
    navigate(path);
  }

  return (
    <>
      <PageTitle description="진료실에서 이 화면을 의사 선생님께 보여 주세요.">
        진료 요약지가
        <br />
        준비됐어요
      </PageTitle>
      {editing ? (
        <SummaryEditForm
          summary={summary}
          onSave={(edits) => {
            setSummary(applySummaryEdits(summary, edits));
            closeEditForm();
          }}
          onCancel={closeEditForm}
        />
      ) : (
        <>
          {/* 요약지 조회 API(#26)를 연결하기 전까지 실제 요약지로 오해하지 않게 알립니다. */}
          <Notice tone="amber">
            <span className="flex items-start gap-3">
              <DesignIcon name="info" />
              <span>
                예시 요약지예요. 실제 문진 내용이 아니니 진료에 쓰지 마세요.
              </span>
            </span>
          </Notice>
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
          <SummaryDocument
            summary={summary}
            caption={`AI가 정리한 내용 · ${formatRecordDate(sampleSummaryCreatedAt)}`}
            large={large}
          />
          <div className="flex flex-col gap-3">
            <Button
              variant={summary.isConfirmed ? "primary" : "outline"}
              aria-pressed={summary.isConfirmed}
              onClick={() => setSummary({ ...summary, isConfirmed: true })}
            >
              내용이 맞아요
            </Button>
            <Button
              ref={editButtonRef}
              variant="neutral"
              onClick={() => setEditing(true)}
            >
              <ScreenIcon name="write" size={22} />
              고칠 곳이 있어요
            </Button>
          </div>
        </>
      )}
      {!editing && (
        <>
          <SummaryStorage
            loggedIn={loggedIn}
            saved={summarySaved}
            onLogin={() => goToRecordFlow("/login")}
            onSave={() =>
              recordConsent
                ? appActions.saveSummary()
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
