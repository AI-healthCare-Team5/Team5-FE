import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate } from "react-router";
import { ScreenIcon } from "@/components/ScreenElements";
import { Button, Chip, Notice, PageTitle } from "@/components/ui";
import { appActions, useAppStore } from "@/stores/appStore";
import {
  createGuardianInput,
  missingGuardianFields,
  missingGuardianMessage,
  relationOptions,
  toGuardianSaveResult,
  toPhoneDigits,
  type GuardianField,
  type GuardianForm,
  type GuardianSaveResult,
} from "@/stores/guardianForm";
import { saveGuardianContact } from "@/stores/memberSession";

function resultMessage(result: GuardianSaveResult | null): string | null {
  if (result?.kind === "invalid" || result?.kind === "error") {
    return result.message;
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

// E03 보호자 연락처 등록·변경입니다. 저장은 PUT /api/members/me/guardian(saveGuardianContact)으로 보냅니다.
export function GuardianPage() {
  const { loggedIn, guardianDraft: form } = useAppStore();
  const navigate = useNavigate();
  const [result, setResult] = useState<GuardianSaveResult | null>(null);
  const [saving, setSaving] = useState(false);
  // state는 다음 렌더 뒤에 바뀌므로, 연속 클릭을 막는 데는 ref를 씁니다.
  const savingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  // 화면을 떠나면 진행 중인 저장 요청의 결과를 버립니다. 늦게 온 응답이 이동·안내·상태를 바꾸지 못하게 합니다.
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );
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

  async function save() {
    const input = createGuardianInput(form);
    if (!input || savingRef.current) {
      return;
    }
    // 보호자는 로그인한 회원에게만 저장합니다. 로그인 뒤 /guardian으로 돌아옵니다.
    if (!loggedIn) {
      goToLogin();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setResult(null);
    const controller = new AbortController();
    abortRef.current = controller;
    let next: GuardianSaveResult;
    try {
      next = toGuardianSaveResult(
        await saveGuardianContact(input, controller.signal),
      );
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      throw error;
    } finally {
      if (!controller.signal.aborted) {
        savingRef.current = false;
        setSaving(false);
      }
    }
    if (controller.signal.aborted) {
      return;
    }
    handle(next);
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
            저장 위치와 보관 방식은 확정되는 대로 안내해요. 내 정보에서 지울 수
            있어요.
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
          disabled={missing.length > 0 || saving}
          aria-busy={saving}
          aria-describedby={
            missing.length > 0 ? "guardian-save-hint" : undefined
          }
          onClick={() => void save()}
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
        <Button variant="outline" disabled={saving} onClick={cancel}>
          취소
        </Button>
      </div>
    </>
  );
}
