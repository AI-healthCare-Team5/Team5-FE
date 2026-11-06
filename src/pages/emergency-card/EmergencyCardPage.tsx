import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router";
import { DesignIcon } from "@/components/DesignIcon";
import { InlineConfirm } from "@/components/InlineConfirm";
import { WarningNotice } from "@/components/WarningNotice";
import { reverseGeocode } from "@/components/map/reverseGeocode";
import type { MapLocation } from "@/components/map/types";
import { ActionLink, Button } from "@/components/ui";
import { EmergencyCardView } from "@/pages/emergency-card/components/EmergencyCardView";
import {
  cardAddress,
  isFromMyInfo,
  loadEmergencyCard,
  type EmergencyCardLoad,
} from "@/pages/emergency-card/emergencyCard";
import { locateWithoutPrompt } from "@/pages/emergency/emergencyRooms";
import { SIGNED_OUT_MESSAGE } from "@/pages/my-info/myInfoScreen";
import { appActions, useAppStore } from "@/stores/appStore";
import { removeGuardianContact } from "@/stores/memberSession";

// E02 응급 카드입니다.
// E01에서 응급 전환된 문진으로 들어오면 서버의 응급 카드를 보여 줍니다.
// 문진 없이 열면(P01 "응급 카드 미리 보기", 주소로 바로 열기) 보호자 정보만 채우고 나머지는 "확인 못 했어요"입니다.
// 미리 보기에는 현재 위치도 채우지 않으므로 위치를 묻거나 주소로 바꾸지 않습니다.
export function EmergencyCardPage() {
  const { emergency, currentLocation, loggedIn, guardian } = useAppStore();
  const navigate = useNavigate();
  const fromMyInfo = isFromMyInfo(useLocation().state);
  const intakeId = emergency?.intakeId ?? null;
  // 받은 결과를 어느 문진의 것인지와 함께 둬서, 문진이 바뀌면 이전 카드를 보여 주지 않습니다.
  const [loaded, setLoaded] = useState<{
    intakeId: string;
    result: EmergencyCardLoad;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [found, setFound] = useState<{
    location: MapLocation;
    address: string | null;
  } | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  // 카드 응답의 보호자는 지운 뒤에도 남아 있으므로, 지웠으면 보여 주지 않습니다.
  const [guardianRemoved, setGuardianRemoved] = useState(false);
  const removeRef = useRef<HTMLButtonElement>(null);
  // "등록하기"는 로그인 여부에 따라 링크이거나 버튼이라 콜백 ref로 받습니다.
  const registerRef = useRef<HTMLElement | null>(null);
  const setRegisterRef = (element: HTMLElement | null) => {
    registerRef.current = element;
  };
  // 내 보호자입니다. 보호자는 로그인한 회원에게만 저장되므로 로그인했을 때만 바꾸기·지우기를 보여 줍니다.
  const myGuardian = loggedIn && !guardianRemoved ? guardian : null;

  const result =
    intakeId && loaded?.intakeId === intakeId ? loaded.result : null;
  const loading = intakeId !== null && result === null;
  const card = result?.kind === "loaded" ? result.card : null;
  const address = cardAddress(intakeId, currentLocation, found);
  // 카드는 로그인했고 등록된 경우에만 전체 번호를 줍니다. 없으면 내 정보에서 받은 가린 번호라도 보여 주고, 전화 버튼은 숨깁니다.
  const shownGuardian = guardianRemoved ? null : (card?.guardian ?? guardian);

  useEffect(() => {
    if (!intakeId) return;
    const controller = new AbortController();
    void loadEmergencyCard(intakeId, controller.signal).then(
      (next) => {
        if (controller.signal.aborted) return;
        if (next.kind === "gone") {
          // 문진이 없거나 내 것이 아니면(SUMMARY_403·404) 명세대로 처음으로 보냅니다.
          appActions.clearEmergency();
          void navigate("/", { replace: true });
          return;
        }
        setLoaded({ intakeId, result: next });
      },
      (error: unknown) => {
        // 화면을 떠나 취소한 요청은 무시하고, 그 밖의 오류는 개발자 실수라 그대로 드러냅니다.
        if (!controller.signal.aborted) throw error;
      },
    );
    return () => controller.abort();
  }, [intakeId, attempt, navigate]);

  // E01처럼 권한 창은 띄우지 않습니다. 이미 받은 위치나 이미 허용된 권한이 있을 때만 위치를 씁니다.
  useEffect(() => {
    if (!intakeId) return;
    void locateWithoutPrompt();
  }, [intakeId]);

  useEffect(() => {
    if (!intakeId || !currentLocation) return;
    let active = true;
    void reverseGeocode(
      currentLocation.latitude,
      currentLocation.longitude,
    ).then((next) => {
      if (active) setFound({ location: currentLocation, address: next });
    });
    return () => {
      active = false;
    };
  }, [intakeId, currentLocation]);

  function retry() {
    setLoaded(null);
    setAttempt((value) => value + 1);
  }

  function startRegister() {
    // 보호자는 로그인한 회원에게만 저장하므로, 로그인하지 않았으면 등록 전에 로그인(L01)으로 안내합니다.
    appActions.prepareLogin("/guardian");
    navigate("/login");
  }

  // 확인 영역이 사라지면 그 안의 버튼에 있던 포커스가 body로 떨어지므로 옮겨 줍니다.
  // 지웠으면 "지우기"도 사라지므로 그 자리에 생기는 "등록하기"로, 아니면 "지우기"로 돌려줍니다.
  async function removeGuardian() {
    setRemoving(true);
    setRemoveError(null);
    const outcome = await removeGuardianContact();
    flushSync(() => {
      setRemoving(false);
      setConfirmingRemove(false);
      if (outcome.kind === "removed") {
        setGuardianRemoved(true);
      } else if (outcome.kind === "needsLogin") {
        setRemoveError(SIGNED_OUT_MESSAGE);
      } else if (outcome.kind !== "saved") {
        setRemoveError(outcome.message);
      }
    });
    (outcome.kind === "failed" ? removeRef : registerRef).current?.focus();
  }

  function cancelRemove() {
    flushSync(() => setConfirmingRemove(false));
    removeRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted">구급대원에게 이 화면을 보여 주세요.</p>
      {result?.kind === "failed" && (
        <div className="flex flex-col gap-3">
          <WarningNotice>{result.message}</WarningNotice>
          <Button variant="outline" onClick={retry}>
            다시 시도
          </Button>
        </div>
      )}
      <EmergencyCardView
        card={card}
        address={address}
        guardian={shownGuardian}
        loading={loading}
      />
      <div className="flex flex-col gap-3">
        <p className="text-[0.889rem] leading-[1.5] text-muted">
          환자가 말한 내용을 정리한 것이며 진단이 아닙니다.
          <br />
          아직 묻지 못한 항목은 ‘확인 못 했어요’로 표시돼요.
        </p>
        <p className="flex flex-wrap items-center gap-x-4 text-[0.889rem] text-muted">
          내 보호자 연락처
          {myGuardian ? (
            <>
              <Link
                to="/guardian"
                className="flex min-h-[44px] items-center font-bold text-brand-strong underline underline-offset-4"
              >
                바꾸기
              </Link>
              <button
                ref={removeRef}
                type="button"
                disabled={removing}
                className="min-h-[44px] font-bold text-brand-strong underline underline-offset-4 disabled:cursor-not-allowed disabled:text-muted"
                onClick={() => setConfirmingRemove(true)}
              >
                지우기
              </button>
            </>
          ) : loggedIn ? (
            <Link
              ref={setRegisterRef}
              to="/guardian"
              className="flex min-h-[44px] items-center font-bold text-brand-strong underline underline-offset-4"
            >
              등록하기
            </Link>
          ) : (
            <button
              ref={setRegisterRef}
              type="button"
              className="min-h-[44px] font-bold text-brand-strong underline underline-offset-4"
              onClick={startRegister}
            >
              등록하기
            </button>
          )}
        </p>
        {confirmingRemove && (
          <InlineConfirm
            message="보호자 연락처를 지울까요? 저장 동의도 함께 거두어져요."
            busy={removing}
            onConfirm={() => void removeGuardian()}
            onCancel={cancelRemove}
          />
        )}
        {removeError && <WarningNotice>{removeError}</WarningNotice>}
      </div>
      <div className="flex flex-col gap-3">
        <a
          href="tel:119"
          className="flex min-h-[max(44px,4.644rem)] items-center justify-center gap-3 rounded-[20px] bg-emergency px-5 py-4 text-center text-[1.222rem] font-bold text-white"
        >
          <DesignIcon name="phone" size={30} />
          119에 전화하기
        </a>
        {!fromMyInfo && (
          <ActionLink to="/emergency" variant="outline">
            응급 안내로 돌아가기
          </ActionLink>
        )}
        <ActionLink to="/" variant="quiet">
          처음으로
        </ActionLink>
      </div>
    </div>
  );
}
