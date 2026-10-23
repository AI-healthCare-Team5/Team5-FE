import { useState } from "react";
import { InlineConfirm } from "@/components/InlineConfirm";
import { ActionLink, Button, Card } from "@/components/ui";

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
      <h2 className="mb-3 text-[1.222rem] font-bold">내 계정</h2>
      <p className="mb-4 inline-block rounded-full bg-brand-soft px-3 py-1 text-[0.833rem] text-brand-strong">
        {loggedIn ? "카카오 로그인 중" : "로그인 안 함"}
      </p>
      {loggedIn ? (
        <div className="space-y-4">
          <p className="font-bold">{nickname ? `${nickname} 님` : "내 기록"}</p>
          <dl className="space-y-2 text-[0.889rem]">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">기록 저장 동의</dt>
              <dd>{recordConsent ? "동의함" : "동의 안 함"}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">저장한 기록</dt>
              <dd>{recordCount}건</dd>
            </div>
          </dl>
          <ActionLink to="/records" variant="outline">
            내 기록 보기
          </ActionLink>
          <ActionLink to="/record-consent" variant="quiet">
            기록 동의 내용 보기
          </ActionLink>
          <Button variant="outline" onClick={onLogout}>
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
