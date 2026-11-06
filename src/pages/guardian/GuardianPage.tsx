import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate } from "react-router";
import { isMockApi } from "@/api/client";
import { ScreenIcon } from "@/components/ScreenElements";
import { Button, Chip, Notice, PageTitle } from "@/components/ui";
import { appActions, useAppStore } from "@/stores/appStore";
import {
  decideGuardianSave,
  missingGuardianFields,
  missingGuardianMessage,
  relationOptions,
  toPhoneDigits,
  type GuardianField,
  type GuardianForm,
  type GuardianSaveResult,
} from "@/stores/guardianForm";

const unavailableMessage =
  "보호자 연락처 저장은 준비 중이에요. 서버를 연결한 뒤에 저장할 수 있어요.";

function resultMessage(result: GuardianSaveResult | null): string | null {
  if (result?.kind === "invalid" || result?.kind === "error") {
    return result.message;
  }
  if (result?.kind === "unavailable") {
    return unavailableMessage;
  }
  return null;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }
  return (
    <p id={id} className="text-[0.889rem] font-semibold text-emergency-ink">
      {message}
    </p>
  );
}

// E03 보호자 연락처 등록입니다. 저장(PUT /api/members/me/guardian) 연결은 #29에서 하고,
// 실패 응답은 그때 guardianSaveError로 바꿔 handle에 넘깁니다.
export function GuardianPage() {
  const { loggedIn, guardianDraft: form } = useAppStore();
  const navigate = useNavigate();
  const [result, setResult] = useState<GuardianSaveResult | null>(null);
  const missing = missingGuardianFields(form);
  const fieldErrors = result?.kind === "invalid" ? result.fieldErrors : {};
  const message = resultMessage(result);
  const relationGroupRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  // 고친 칸의 서버 안내만 지웁니다.
  function edit(field: GuardianField, patch: Partial<GuardianForm>) {
    appActions.editGuardianDraft(patch);
    setResult((previous) => {
      if (previous?.kind !== "invalid") {
        return null;
      }
      const rest = { ...previous.fieldErrors };
      delete rest[field];
      return { ...previous, fieldErrors: rest };
    });
  }

  function goToLogin() {
    appActions.prepareLogin("/guardian");
    navigate("/login");
  }

  function handle(next: GuardianSaveResult) {
    if (next.kind === "saved") {
      appActions.clearGuardianDraft();
      navigate("/my-info");
      return;
    }
    if (next.kind === "needsLogin") {
      goToLogin();
      return;
    }
    // 칸 안내가 그려진 뒤에 포커스를 옮겨야 aria-describedby로 이어진 안내를 함께 읽습니다.
    flushSync(() => setResult(next));
    if (next.kind === "invalid") {
      focusFirstError(next.fieldErrors);
    }
  }

  // 서버가 칸 오류만 알려 주면 위쪽 안내(role="alert")가 없어서, 첫 오류 칸으로 포커스를 옮겨 안내를 읽게 합니다.
  function focusFirstError(errors: Partial<Record<GuardianField, string>>) {
    if (errors.relation) {
      relationGroupRef.current?.querySelector("button")?.focus();
    } else if (errors.phoneNumber) {
      phoneRef.current?.focus();
    } else if (errors.consentAgreed) {
      consentRef.current?.focus();
    }
  }

  function save() {
    const next = decideGuardianSave(form, { loggedIn, mockApi: isMockApi });
    if (next) {
      handle(next);
    }
  }

  function cancel() {
    appActions.clearGuardianDraft();
    navigate("/my-info");
  }

  return (
    <>
      <PageTitle description="응급 카드에 함께 보여요. 구급대원이 이 번호로 바로 전화할 수 있어요.">
        보호자 연락처를
        <br />
        등록해 주세요
      </PageTitle>
      <section
        aria-labelledby="guardian-relation"
        className="flex flex-col gap-3"
      >
        <h2 id="guardian-relation" className="text-[1.111rem] font-bold">
          누구인가요?
        </h2>
        <div
          ref={relationGroupRef}
          role="group"
          aria-labelledby="guardian-relation"
          aria-describedby={
            fieldErrors.relation ? "guardian-relation-error" : undefined
          }
          className="grid grid-cols-2 gap-[10px]"
        >
          {relationOptions.map(({ value, label }) => (
            <Chip
              key={value}
              selected={form.relation === value}
              onClick={() => edit("relation", { relation: value })}
            >
              {label}
            </Chip>
          ))}
        </div>
        <FieldError
          id="guardian-relation-error"
          message={fieldErrors.relation}
        />
      </section>
      <section className="flex flex-col gap-3">
        <label htmlFor="guardian-phone" className="text-[1.111rem] font-bold">
          전화번호
        </label>
        <input
          ref={phoneRef}
          id="guardian-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          placeholder="010-0000-0000"
          value={form.phoneNumber}
          onChange={(event) =>
            edit("phoneNumber", {
              phoneNumber: toPhoneDigits(event.target.value),
            })
          }
          aria-invalid={fieldErrors.phoneNumber ? true : undefined}
          aria-describedby={`guardian-phone-hint${fieldErrors.phoneNumber ? " guardian-phone-error" : ""}`}
          className="min-h-[max(44px,3.6rem)] w-full rounded-[16px] border-2 border-control bg-surface px-4 py-3 text-[1.111rem] font-semibold placeholder:text-subtle"
        />
        <p id="guardian-phone-hint" className="text-[0.889rem] text-muted">
          숫자만 눌러 주세요
        </p>
        <FieldError
          id="guardian-phone-error"
          message={fieldErrors.phoneNumber}
        />
      </section>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 rounded-[16px] border border-line bg-surface p-4">
          <input
            ref={consentRef}
            id="guardian-consent"
            type="checkbox"
            checked={form.consentAgreed}
            onChange={(event) =>
              edit("consentAgreed", { consentAgreed: event.target.checked })
            }
            aria-invalid={fieldErrors.consentAgreed ? true : undefined}
            aria-describedby={
              fieldErrors.consentAgreed ? "guardian-consent-error" : undefined
            }
            className="h-[44px] w-[44px] shrink-0 accent-brand"
          />
          <div className="flex min-w-0 flex-col items-start gap-1">
            <label htmlFor="guardian-consent" className="font-semibold">
              <span className="text-brand-strong">[필수]</span> 보호자 연락처
              저장에 동의해요
            </label>
            <Link
              to="/guardian-consent?from=guardian"
              className="inline-flex min-h-[44px] items-center font-bold text-brand-strong underline underline-offset-4"
            >
              내용 보기
            </Link>
          </div>
        </div>
        <FieldError
          id="guardian-consent-error"
          message={fieldErrors.consentAgreed}
        />
      </div>
      <Notice>
        <span className="flex items-start gap-3">
          <ScreenIcon name="shield" size={22} />
          <span>
            {/* "내 정보에서 지울 수 있어요"는 P01 지우기(#32)를 붙일 때 다시 넣습니다. */}
            저장 위치와 보관 방식은 확정되는 대로 안내해요.
          </span>
        </span>
      </Notice>
      {message && (
        <div role="alert">
          <Notice tone="amber">{message}</Notice>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <Button
          disabled={missing.length > 0}
          aria-describedby={
            missing.length > 0 ? "guardian-save-hint" : undefined
          }
          onClick={save}
        >
          저장하기
        </Button>
        {missing.length > 0 && (
          <p
            id="guardian-save-hint"
            className="text-center text-[0.889rem] text-muted"
          >
            {missingGuardianMessage(missing)}
          </p>
        )}
        <Button variant="outline" onClick={cancel}>
          취소
        </Button>
      </div>
    </>
  );
}
