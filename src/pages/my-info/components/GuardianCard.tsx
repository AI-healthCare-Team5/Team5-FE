import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Guardian } from "@/api/guardians";
import { InlineConfirm } from "@/components/InlineConfirm";
import { WarningNotice } from "@/components/WarningNotice";
import { Card } from "@/components/ui";
import { formatGuardian } from "@/components/guardian/guardianText";

// 지우기 확인 문구입니다. 서버(DELETE /members/me/guardian)가 보호자 저장 동의도 함께 철회하므로 함께 알립니다.
// C01 "동의를 거두려면요?"의 "내 정보에서 연락처를 지우면 동의도 함께 거두어져요"와 같은 내용입니다.
export const REMOVE_GUARDIAN_CONFIRM_MESSAGE =
  "보호자 연락처를 지울까요? 저장 동의도 함께 거두어져요.";

const linkClass =
  "flex min-h-[44px] items-center font-bold text-brand-strong underline underline-offset-4 disabled:cursor-not-allowed disabled:text-muted";

// P01 보호자 연락처 카드입니다. 전화번호는 내 정보 응답처럼 가운데를 가린 값입니다.
// "바꾸기"·"등록하기"는 보호자 연락처 등록(E03, #31) 경로가 생기면 이 카드에 둡니다.
export function GuardianCard({
  guardian,
  busy,
  message,
  onRemove,
}: {
  guardian: Guardian | null;
  // 로그아웃·탈퇴·지우기 요청이 진행 중이면 버튼을 잠급니다.
  busy: boolean;
  // 지우기가 실패했을 때의 안내입니다.
  message: string | null;
  // 지웠으면 true입니다.
  onRemove: () => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);

  // 확인 영역이 사라지면 그 안의 버튼에 있던 포커스가 body로 떨어지므로 옮겨 줍니다.
  // 지웠으면 지우기 버튼도 사라지므로 카드 제목으로, 아니면 지우기 버튼으로 돌려줍니다.
  async function confirmRemove() {
    const removed = await onRemove();
    flushSync(() => setConfirming(false));
    if (removed) {
      headingRef.current?.focus();
    } else {
      removeRef.current?.focus();
    }
  }

  function cancelRemove() {
    flushSync(() => setConfirming(false));
    removeRef.current?.focus();
  }

  return (
    <Card>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mb-[14px] text-[1.111rem] font-bold"
      >
        보호자 연락처
      </h2>
      {guardian ? (
        <div className="space-y-2">
          <p className="text-[1.222rem] font-bold break-words">
            {formatGuardian(guardian)}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <button
              ref={removeRef}
              type="button"
              className={linkClass}
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              지우기
            </button>
          </div>
          {confirming && (
            <InlineConfirm
              message={REMOVE_GUARDIAN_CONFIRM_MESSAGE}
              busy={busy}
              onConfirm={() => void confirmRemove()}
              onCancel={cancelRemove}
            />
          )}
          {message && <WarningNotice>{message}</WarningNotice>}
        </div>
      ) : (
        <p className="text-muted">등록된 연락처가 없어요</p>
      )}
    </Card>
  );
}
