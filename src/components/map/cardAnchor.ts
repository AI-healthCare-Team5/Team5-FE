// 지도 마커와 목록 카드를 잇는 요소 ID입니다. 목록이 둘인 화면(S05, E01)은 구분하려고 scope를 다르게 씁니다.
export function hospitalCardId(scope: string, hospitalId: string): string {
  return `${scope}-card-${hospitalId}`;
}

// 선택한 ID가 지금 목록에 없으면(목록이 다시 조회돼 바뀐 경우) 첫 항목을 선택한 것으로 봅니다.
export function resolveActiveId(
  selectedId: string | undefined,
  ids: readonly string[],
): string | undefined {
  return selectedId !== undefined && ids.includes(selectedId)
    ? selectedId
    : ids[0];
}

// 마커를 눌렀을 때 해당 카드의 선택 버튼으로 포커스를 옮기고 화면에 보이게 합니다.
// 키보드·스크린리더 사용자도 어느 카드가 선택됐는지 바로 알 수 있습니다.
// 하단 119 바에 가려지지 않도록 카드의 scroll-margin-bottom을 함께 씁니다.
// 움직임 줄이기를 켠 사용자에게는 애니메이션 없이 이동합니다.
export function revealCard(scope: string, hospitalId: string) {
  const card = document.getElementById(hospitalCardId(scope, hospitalId));
  if (!card) return;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  card.querySelector("button")?.focus({ preventScroll: true });
  card.scrollIntoView({
    block: "nearest",
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

// 지도에 그릴 수 있는 좌표인지 봅니다. API 타입은 number지만 NaN·무한대가 오면 SDK가 오류를 냅니다.
export function isMapPoint(point: {
  latitude: number;
  longitude: number;
}): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}
