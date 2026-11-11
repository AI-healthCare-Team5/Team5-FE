// 지도 마커의 모양을 한곳에서 관리합니다.
export function hospitalMarkerClassName(selected: boolean) {
  const base =
    "grid h-[44px] w-[44px] place-items-center rounded-full border-[3px] border-white p-0 leading-none font-bold text-white shadow-md";
  return selected
    ? `${base} z-10 bg-ink ring-4 ring-brand/30`
    : `${base} bg-brand`;
}

// 현재 위치는 빨강 계열(locate 토큰) 중심점, 흰 테두리, 옅은 바깥 고리입니다. 파란 번호 마커·진한 선택 마커와 색과 크기로 구별됩니다.
export const userLocationClassName =
  "pointer-events-none block h-[18px] w-[18px] rounded-full border-[3px] border-white bg-locate shadow-md ring-[8px] ring-locate/25";
