import { Link } from "react-router";
import { Card } from "@/components/ui";
import { GUARDIAN_STORAGE_TEXT } from "@/components/guardian/guardianText";

// P01 보호자 연락처 저장 동의 카드입니다. 동의는 보호자를 등록할 때 함께 하고 지울 때 함께 철회되므로,
// 동의한 경우에만 그립니다(동의 철회 API는 따로 없습니다).
export function GuardianConsentCard() {
  return (
    <Card>
      <div className="mb-[14px] flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[1.111rem] font-bold">저장 동의</h2>
        <p className="inline-block rounded-full bg-success-soft px-3 py-1 text-[0.889rem] font-bold text-success">
          동의함
        </p>
      </div>
      <dl className="space-y-2 text-[0.889rem]">
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
          <dt className="text-muted">저장 항목</dt>
          <dd>보호자 관계, 전화번호</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
          <dt className="text-muted">저장 위치</dt>
          <dd>{GUARDIAN_STORAGE_TEXT}</dd>
        </div>
      </dl>
      <Link
        to="/guardian-consent?from=my-info"
        className="mt-2 flex min-h-[44px] items-center font-bold text-brand-strong underline underline-offset-4"
      >
        동의 내용 보기
      </Link>
    </Card>
  );
}
