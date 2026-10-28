import { useState } from "react";
import { Link } from "react-router";
import { InlineConfirm } from "@/components/InlineConfirm";
import { ActionLink, Button, Card } from "@/components/ui";
import { ScreenIcon } from "@/components/ScreenElements";

export interface AccountCardProps {
  loggedIn: boolean;
  nickname?: string;
  recordConsent: boolean;
  recordCount: number;
  onLogout: () => void;
  onWithdraw: () => void;
}

export function AccountCard({
  loggedIn,
  nickname,
  recordConsent,
  recordCount,
  onLogout,
  onWithdraw,
}: AccountCardProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Card>
      <div className="mb-[14px] flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[1.111rem] font-bold">내 계정</h2>
        <p
          className={`inline-block rounded-full px-3 py-1 text-[0.889rem] font-bold ${loggedIn ? "bg-success-soft text-success" : "bg-brand-soft text-brand-strong"}`}
        >
          {loggedIn ? "로그인 중" : "로그인 안 함"}
        </p>
      </div>
      {loggedIn ? (
        <div className="space-y-[14px]">
          <div className="flex items-center gap-3">
            <span className="grid size-[44px] shrink-0 place-items-center rounded-full bg-kakao">
              <ScreenIcon name="kakao" size={24} />
            </span>
            <div>
              <p className="text-[1.111rem] font-bold">
                {nickname || "내 기록"}
              </p>
              <p className="text-[0.889rem] text-subtle">카카오 계정</p>
            </div>
          </div>
          <dl className="space-y-2 text-[0.889rem]">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">기록 저장 동의</dt>
              <dd>{recordConsent ? "동의함" : "동의 안 함"}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">저장된 기록</dt>
              <dd>요약지 {recordCount}건</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link
              to="/records"
              className="flex min-h-[44px] items-center font-bold text-brand-strong underline underline-offset-4"
            >
              내 기록 보기
            </Link>
            <Link
              to="/record-consent"
              className="flex min-h-[44px] items-center font-bold text-brand-strong underline underline-offset-4"
            >
              기록 동의 내용 보기
            </Link>
          </div>
          <Button variant="neutral" onClick={onLogout}>
            로그아웃
          </Button>
          <Button variant="quiet" onClick={() => setConfirming(true)}>
            탈퇴하고 기록 모두 지우기
          </Button>
          {confirming && (
            <InlineConfirm
              message="탈퇴하고 기록을 모두 지울까요? 기록 저장 동의도 함께 거두어져요."
              onCancel={() => setConfirming(false)}
              onConfirm={onWithdraw}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-muted">
            로그인하면 진료 기록을 모아 볼 수 있어요.
          </p>
          <ActionLink to="/login" variant="outline">
            로그인하기
          </ActionLink>
        </div>
      )}
    </Card>
  );
}
