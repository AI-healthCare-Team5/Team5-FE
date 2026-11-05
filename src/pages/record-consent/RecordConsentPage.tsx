import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { ActionLink, Button, Card, Notice, PageTitle } from "@/components/ui";
import { WarningNotice } from "@/components/WarningNotice";
import { useAppStore } from "@/stores/appStore";
import { submitRecordConsent } from "@/stores/recordConsent";
import { ScreenIcon } from "@/components/ScreenElements";
import { recordConsentItems } from "@/pages/record-consent/recordConsentItems";

export function RecordConsentPage() {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { loggedIn, returnTo } = useAppStore();
  const navigate = useNavigate();
  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }
  async function agree() {
    if (!checked || submitting) {
      return;
    }
    setSubmitting(true);
    setMessage(null);
    // 서버가 동의를 받은 뒤에만 다음으로 갑니다.
    const outcome = await submitRecordConsent();
    if (outcome.kind === "agreed") {
      // 동의 뒤 S06으로 돌아오면 S06이 보관하려던 요약지를 보관합니다(saveAfterReturn).
      navigate(returnTo);
      return;
    }
    setSubmitting(false);
    // 로그인이 풀렸으면 store가 비로그인으로 바뀌어 위의 Navigate가 로그인으로 보냅니다.
    if (outcome.kind === "failed") {
      setMessage(outcome.message);
    }
  }
  return (
    <>
      <PageTitle description="읽어 보고 동의 여부를 정해 주세요.">
        진료 기록
        <br />
        저장 동의
      </PageTitle>
      <Notice tone="amber">
        <span className="flex items-start gap-3">
          <ScreenIcon name="warning-amber" size={22} />
          <span>정책이 정해지기 전의 문구예요. 검토 후 바뀔 수 있어요.</span>
        </span>
      </Notice>
      <Card>
        <dl className="space-y-4">
          {recordConsentItems.map(([title, text]) => (
            <div key={title}>
              <dt className="mb-1 text-[0.889rem] font-bold text-muted">
                {title}
              </dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <label className="flex min-h-[70px] cursor-pointer items-center gap-3 rounded-[16px] border border-control bg-surface px-[15px] py-[13px]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="h-[44px] w-[44px] shrink-0 accent-brand"
        />
        <span className="font-semibold">[필수] 진료 기록 저장에 동의해요</span>
      </label>
      <div className="flex flex-col gap-3">
        {message && <WarningNotice>{message}</WarningNotice>}
        <Button
          disabled={!checked || submitting}
          aria-busy={submitting}
          onClick={() => void agree()}
        >
          동의하고 시작하기
        </Button>
        {!checked && (
          <p className="text-center text-[0.889rem] text-muted">
            동의에 체크해 주세요
          </p>
        )}
        <ActionLink to="/" variant="outline">
          동의하지 않아요
        </ActionLink>
      </div>
    </>
  );
}
